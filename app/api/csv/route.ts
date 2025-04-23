import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// Firebase SDK 임포트 (필요한 경우 패키지 설치 필요)
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { initializeApp, FirebaseApp } from 'firebase/app';

// Firebase 설정 - .env.local 파일에서 값 가져오기
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase 설정 값 확인
if (!firebaseConfig.apiKey || !firebaseConfig.storageBucket) {
  console.error('Firebase 설정이 완전하지 않습니다. .env.local 파일을 확인하세요.');
}

// Firebase 초기화
let app: FirebaseApp | undefined;
try {
  app = initializeApp(firebaseConfig);
  console.log('Firebase가 성공적으로 초기화되었습니다.');
} catch (error) {
  console.error('Firebase 초기화 오류:', error);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // 파라미터 처리: 이전 버전 호환성 유지
  const file = searchParams.get('file');
  const folder = searchParams.get('folder');
  const filename = searchParams.get('filename');
  
  // file 파라미터 또는 folder/filename 조합 사용
  let targetFile = file;
  if (!targetFile && folder && filename) {
    targetFile = `${folder}/${filename}`;
  }
  
  const source = searchParams.get('source') || 'firebase'; // 기본값을 'firebase'로 변경

  if (!targetFile) {
    return NextResponse.json({ error: 'No file name provided' }, { status: 400 });
  }

  // Ensure the file name is safe and only contains alphanumeric characters,
  // dashes, underscores, and specific special characters
  const safeFileName = targetFile.replace(/[^a-zA-Z0-9\-_\.@\/]/g, '');
  
  try {
    let fileContent;
    
    if (source === 'firebase') {
      // Firebase에서 파일 가져오기
      try {
        if (!app) {
          throw new Error('Firebase가 초기화되지 않았습니다');
        }
        
        const storage = getStorage(app);
        // Firebase Storage에서는 폴더 경로를 그대로 사용
        const fileRef = ref(storage, safeFileName);
        
        // 다운로드 URL 가져오기
        const downloadURL = await getDownloadURL(fileRef).catch(err => {
          throw err;
        });
        
        // 파일 다운로드
        const response = await fetch(downloadURL);
        if (!response.ok) {
          throw new Error(`Firebase 파일 다운로드 실패: ${response.statusText}`);
        }
        
        fileContent = await response.text();
      } catch (firebaseError) {
        console.error('Firebase 파일 읽기 오류:', firebaseError, '경로:', safeFileName);
        return NextResponse.json({ 
          error: 'Firebase에서 파일을 읽는 데 실패했습니다',
          details: firebaseError instanceof Error ? firebaseError.message : '알 수 없는 오류' 
        }, { status: 500 });
      }
    } else {
      // 로컬 파일 시스템에서 가져오기
      const filePath = path.join(process.cwd(), 'data', safeFileName);
      
      // Verify the file exists
      if (!fs.existsSync(filePath)) {
        console.error('파일을 찾을 수 없습니다:', filePath);
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      
      // Check if it's a CSV file
      if (!safeFileName.toLowerCase().endsWith('.csv')) {
        return NextResponse.json({ error: 'Invalid file type. Only CSV files are allowed.' }, { status: 400 });
      }
      
      // Read the file
      fileContent = fs.readFileSync(filePath, 'utf-8');
    }
    
    // Return the CSV content with proper headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${path.basename(safeFileName)}"`,
      },
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json({ 
      error: 'Failed to read file',
      details: error instanceof Error ? error.message : '알 수 없는 오류' 
    }, { status: 500 });
  }
} 