import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dataDirectory = path.join(process.cwd(), "public/data");
    
    // Check if directory exists
    if (!fs.existsSync(dataDirectory)) {
      console.log("Data directory does not exist, returning empty array");
      return NextResponse.json([]);
    }
    
    const files = fs.readdirSync(dataDirectory);

    const csvFiles = files
      .filter((file) => file.endsWith(".csv"))
      .map((file) => ({
        name: file.replace(".csv", ""),
        path: `/data/${file}`,
        description: "CSV data file",
      }));

    return NextResponse.json(csvFiles);
  } catch (error) {
    console.error("Error reading data directory:", error);
    return NextResponse.json(
      { error: "Failed to read example files" },
      { status: 500 }
    );
  }
} 