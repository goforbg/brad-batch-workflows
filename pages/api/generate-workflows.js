export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { batchResults } = req.body;

    // Validate required parameters
    if (
      !batchResults ||
      !Array.isArray(batchResults) ||
      batchResults.length === 0
    ) {
      return res.status(400).json({
        message: "batchResults array is required and must not be empty"
      });
    }

    // Generate current date in DD-MMM-YY format
    const now = new Date();
    const day = now.getDate().toString().padStart(2, "0");
    const month = now.toLocaleString("en-US", { month: "short" }).toUpperCase();
    const year = now.getFullYear().toString().slice(-2);
    const date = `${day}-${month}-${year}`;

    // Generate workflows array for all batches combined
    const workflows = [];

    batchResults.forEach((batch, batchIndex) => {
      const batchNumber = batchIndex + 1;

      // Add Sales workflow
      workflows.push({
        apollo_url: batch.sales,
        fileName: `BRAD_${date}_BATCH_${batchNumber}_PART_1_SALES`
      });

      // Add Marketing workflow
      workflows.push({
        apollo_url: batch.marketing,
        fileName: `BRAD_${date}_BATCH_${batchNumber}_PART_2_MARKETING`
      });

      // Add IT workflow
      workflows.push({
        apollo_url: batch.it,
        fileName: `BRAD_${date}_BATCH_${batchNumber}_PART_3_IT`
      });
    });

    const response = {
      workflows: workflows
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Generate Workflows Error:", error);
    res.status(500).json({ message: error.message });
  }
}
