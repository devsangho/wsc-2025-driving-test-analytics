import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const fileName = searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
  }

  // Ensure the file name is safe and only contains alphanumeric characters,
  // dashes, underscores, and specific special characters
  const safeFileName = fileName.replace(/[^a-zA-Z0-9\-_\.@\-]/g, '');
  
  try {
    const filePath = path.join(process.cwd(), 'data', safeFileName);
    
    // Verify the file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    
    // Check if it's a CSV file
    if (!filePath.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Invalid file type. Only CSV files are allowed.' }, { status: 400 });
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // Return the CSV content with proper headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${safeFileName}"`,
      },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
} 