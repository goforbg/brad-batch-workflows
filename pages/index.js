import { useState } from 'react';
import Head from 'next/head';
import Papa from 'papaparse';

// --- URL Templates (No Changes) ---
const urlTemplates = {
    sales: "https://app.apollo.io/#/people?page=1&personDepartmentOrSubdepartments[]=account_management&personDepartmentOrSubdepartments[]=business_development&personDepartmentOrSubdepartments[]=revenue_operations&personDepartmentOrSubdepartments[]=sales&personDepartmentOrSubdepartments[]=sales_operations&qOrganizationSearchListId=REPLACE_ME&sortAscending=false&sortByField=recommendations_score",
    marketing: "https://app.apollo.io/#/people?page=1&sortAscending=false&sortByField=recommendations_score&qOrganizationSearchListId=REPLACE_ME&personDepartmentOrSubdepartments[]=demand_generation&personDepartmentOrSubdepartments[]=ecommerce_marketing&personDepartmentOrSubdepartments[]=event_marketing&personDepartmentOrSubdepartments[]=lead_generation&personDepartmentOrSubdepartments[]=marketing&personDepartmentOrSubdepartments[]=marketing_communications&personDepartmentOrSubdepartments[]=product_marketing&personDepartmentOrSubdepartments[]=strategic_communications",
    it: "https://app.apollo.io/#/people?contactEmailStatusV2[]=verified&contactEmailExcludeCatchAll=true&sortAscending=false&sortByField=recommendations_score&personDepartmentOrSubdepartments[]=information_technology_executive&personDepartmentOrSubdepartments[]=business_service_management_itsm&personDepartmentOrSubdepartments[]=enterprise_architecture&personDepartmentOrSubdepartments[]=information_security&personDepartmentOrSubdepartments[]=information_technology&personDepartmentOrSubdepartments[]=infrastructure&personDepartmentOrSubdepartments[]=it_asset_management&personDepartmentOrSubdepartments[]=it_audit_it_compliance&personDepartmentOrSubdepartments[]=it_operations&personDepartmentOrSubdepartments[]=it_procurement&personDepartmentOrSubdepartments[]=it_strategy&personNotTitles[]=Sales&personNotTitles[]=recruiting&personNotTitles[]=talent&page=1&qOrganizationSearchListId=REPLACE_ME"
};

// --- Helper function to split an array into chunks ---
const chunkArray = (array, size) => {
    const chunkedArr = [];
    for (let i = 0; i < array.length; i += size) {
        chunkedArr.push(array.slice(i, i + size));
    }
    return chunkedArr;
};

export default function ApolloToolPage() {
    const [file, setFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [batchResults, setBatchResults] = useState([]); // To store results for all batches
    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [error, setError] = useState(null);

    const handleFileChange = (e) => {
        setError(null);
        setBatchResults([]);
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const handleProcessFile = () => {
        if (!file) {
            setError("Please select a CSV file first.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setBatchResults([]);
        setStatusMessage('');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const domainColumnName = 'domain'; // IMPORTANT: Change if your column name is different
                    if (!results.data[0]?.hasOwnProperty(domainColumnName)) {
                        throw new Error(`CSV must have a column named '${domainColumnName}'.`);
                    }

                    const extractedDomains = results.data.map(row => row[domainColumnName]).filter(Boolean);
                    if (extractedDomains.length === 0) {
                        throw new Error("No domains found in the specified column.");
                    }

                    const domainBatches = chunkArray(extractedDomains, 9000);
                    setStatusMessage(`Found ${extractedDomains.length} domains. Processing in ${domainBatches.length} batches...`);

                    const allResults = [];
                    for (let i = 0; i < domainBatches.length; i++) {
                        setStatusMessage(`Processing batch ${i + 1} of ${domainBatches.length}...`);
                        const batch = domainBatches[i];
                        const searchListId = await getApolloId(batch);
                        
                        const newLinks = {
                            sales: urlTemplates.sales.replace(/REPLACE_ME/g, searchListId),
                            marketing: urlTemplates.marketing.replace(/REPLACE_ME/g, searchListId),
                            it: urlTemplates.it.replace(/REPLACE_ME/g, searchListId)
                        };
                        allResults.push(newLinks);
                    }
                    
                    setBatchResults(allResults);
                    setStatusMessage('Processing complete!');

                } catch (err) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            },
            error: (err) => {
                setError(err.message);
                setIsLoading(false);
            }
        });
    };

    const getApolloId = async (domainList) => {
        const response = await fetch('/api/get-organization-id', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ domains: domainList }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'An API error occurred.');
        }
        return data.searchListId;
    };

    return (
        <>
            <Head>
                <title>Apollo Batch Link Generator</title>
            </Head>
            <div style={styles.globalStyles}>
                <div style={styles.container}>
                    <header style={styles.header}>
                        <h1 style={styles.title}>Apollo Batch Link Generator</h1>
                        <p style={styles.subtitle}>Upload a CSV with up to 100,000+ domains.</p>
                    </header>
                    
                    <main>
                        <div style={styles.uploadBox}>
                            <label htmlFor="csv-upload" style={styles.uploadLabel}>Click to Choose File</label>
                            <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} style={{ display: 'none' }} />
                            {fileName && <p style={styles.fileName}>{fileName}</p>}
                        </div>

                        <button onClick={handleProcessFile} disabled={isLoading || !file} style={(isLoading || !file) ? {...styles.button, ...styles.buttonDisabled} : styles.button}>
                            {isLoading ? statusMessage : 'Generate Links'}
                        </button>

                        {error && <div style={styles.errorBox}><p style={{margin: 0}}>Error: {error}</p></div>}

                        {batchResults.length > 0 && (
                            <div style={styles.resultsContainer}>
                                <h2 style={styles.resultsTitle}>Generated Links ({batchResults.length} {batchResults.length > 1 ? 'Batches' : 'Batch'})</h2>
                                {batchResults.map((links, index) => (
                                    <div key={index} style={styles.batchSection}>
                                        <h3 style={styles.batchTitle}>Batch {index + 1}</h3>
                                        <div style={styles.linkGroup}>
                                            <label style={styles.label}>Sales Link</label>
                                            <input type="text" readOnly value={links.sales} style={styles.resultInput} onFocus={(e) => e.target.select()} />
                                        </div>
                                        <div style={styles.linkGroup}>
                                            <label style={styles.label}>Marketing Link</label>
                                            <input type="text" readOnly value={links.marketing} style={styles.resultInput} onFocus={(e) => e.target.select()} />
                                        </div>
                                        <div style={styles.linkGroup}>
                                            <label style={styles.label}>IT Link</label>
                                            <input type="text" readOnly value={links.it} style={styles.resultInput} onFocus={(e) => e.target.select()} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}

// --- STYLES ---
const styles = {
    globalStyles: { fontFamily: "'Inter', sans-serif", backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '40px 20px', boxSizing: 'border-box', color: '#1a202c' },
    container: { maxWidth: '700px', margin: '0 auto', backgroundColor: '#ffffff', padding: '40px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' },
    header: { textAlign: 'center', marginBottom: '40px' },
    title: { fontSize: '28px', fontWeight: 700, margin: '0 0 10px 0' },
    subtitle: { fontSize: '16px', color: '#4a5568', margin: 0 },
    uploadBox: { border: '2px dashed #cbd5e0', borderRadius: '6px', padding: '40px 20px', textAlign: 'center', cursor: 'pointer', backgroundColor: '#f7fafc' },
    uploadLabel: { fontWeight: 500, color: '#4263eb' },
    fileName: { marginTop: '15px', fontSize: '14px', color: '#2d3748', fontWeight: 500 },
    button: { display: 'block', width: '100%', padding: '12px', marginTop: '20px', fontSize: '16px', fontWeight: 500, color: '#ffffff', backgroundColor: '#4263eb', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s' },
    buttonDisabled: { backgroundColor: '#868e96', cursor: 'not-allowed' },
    errorBox: { marginTop: '20px', padding: '12px', backgroundColor: '#fff5f5', border: '1px solid #f5c6cb', borderRadius: '6px', color: '#c53030', fontWeight: 500 },
    resultsContainer: { marginTop: '40px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' },
    resultsTitle: { fontSize: '22px', fontWeight: 700, marginBottom: '20px' },
    batchSection: {
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '6px',
        border: '1px solid #e9ecef',
    },
    batchTitle: {
        fontSize: '18px',
        fontWeight: 700,
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid #dee2e6',
    },
    linkGroup: { marginBottom: '20px' },
    label: { display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '8px', color: '#2d3748' },
    resultInput: { width: '100%', padding: '10px', fontSize: '14px', fontFamily: "'Inter', sans-serif", border: '1px solid #e2e8f0', borderRadius: '6px', boxSizing: 'border-box', backgroundColor: '#f7fafc', color: '#2d3748' },
};