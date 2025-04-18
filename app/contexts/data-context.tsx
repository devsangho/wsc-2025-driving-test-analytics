"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { DataRow } from "@/types/data";
import Papa from "papaparse";

interface MapDataRow {
  Latitude: number;
  Longitude: number;
  "Elevation (m)": number;
  City: string;
  Weather_loc: string;
  Distance_km: number;
  Difference_km: number;
}

// Define data types for our application
export enum DataType {
  MAP = "map",            // Route/map data
  CAN_BMS = "can_bms",    // Battery management data
  CAN_MPPT = "can_mppt",  // Solar power data
  CAN_VELOCITY = "can_velocity", // Speed/velocity data
  MS60S_IRRADIANCE = "ms60s_irradiance", // Solar irradiance data
  MS60S_TILT = "ms60s_tilt", // Solar panel tilt data
  MS60S_TEMPERATURE = "ms60s_temperature" // Temperature data
}

// 데이터 소스별로 저장할 데이터 타입 정의
export interface DataSet {
  type: string;  // 'can', 'ms60s', 'map' 등 데이터 소스 타입
  fileName: string; // 파일 이름
  data: DataRow[]; // 실제 데이터
}

interface DataContextType {
  currentData: DataRow[];  // 현재 선택된/표시되는 데이터
  setCurrentData: (data: DataRow[]) => void;
  dataSets: DataSet[];  // 모든 데이터셋 저장
  addDataSet: (dataSet: DataSet) => void;
  clearDataSets: () => void;
  selectDataSet: (type: string, fileName: string) => void;
  isMapDataLoaded: boolean;
  setIsMapDataLoaded: (isLoaded: boolean) => void;
  availableDataTypes: DataType[];
  setAvailableDataTypes: (types: DataType[]) => void;
  hasDataType: (type: DataType) => boolean;
  addDataType: (type: DataType) => void;
  removeDataType: (type: DataType) => void;
}

const DataContext = createContext<DataContextType>({
  currentData: [],
  setCurrentData: () => {},
  dataSets: [],
  addDataSet: () => {},
  clearDataSets: () => {},
  selectDataSet: () => {},
  isMapDataLoaded: false,
  setIsMapDataLoaded: () => {},
  availableDataTypes: [],
  setAvailableDataTypes: () => {},
  hasDataType: () => false,
  addDataType: () => {},
  removeDataType: () => {}
});

export const useDataContext = () => useContext(DataContext);

export function DataProvider({ children }: { children: ReactNode }) {
  const [currentData, setCurrentData] = useState<DataRow[]>([]);
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [isMapDataLoaded, setIsMapDataLoaded] = useState<boolean>(false);
  const [availableDataTypes, setAvailableDataTypes] = useState<DataType[]>([]);

  // 새 데이터셋 추가 함수
  const addDataSet = (dataSet: DataSet) => {
    // 이미 같은 파일명의 데이터가 있으면 교체, 없으면 추가
    setDataSets(prev => {
      const exists = prev.findIndex(ds => ds.fileName === dataSet.fileName && ds.type === dataSet.type);
      if (exists >= 0) {
        const newSets = [...prev];
        newSets[exists] = dataSet;
        return newSets;
      } else {
        return [...prev, dataSet];
      }
    });
    
    // 새로 추가된 데이터를 현재 데이터로 설정
    setCurrentData(dataSet.data);
  };
  
  // 모든 데이터셋 초기화
  const clearDataSets = () => {
    setDataSets([]);
    setCurrentData([]);
  };
  
  // 특정 데이터셋 선택
  const selectDataSet = (type: string, fileName: string) => {
    const selectedSet = dataSets.find(ds => ds.type === type && ds.fileName === fileName);
    if (selectedSet) {
      setCurrentData(selectedSet.data);
    }
  };

  // Helper functions for data type management
  const hasDataType = (type: DataType) => availableDataTypes.includes(type);
  
  const addDataType = (type: DataType) => {
    if (!hasDataType(type)) {
      setAvailableDataTypes(prev => [...prev, type]);
    }
  };
  
  const removeDataType = (type: DataType) => {
    setAvailableDataTypes(prev => prev.filter(t => t !== type));
  };

  // Detect data type based on columns
  const detectDataType = (headers: string[]) => {
    console.log("Detecting data types from headers:", headers);
    
    // 대소문자 무시를 위해 모든 헤더를 소문자로 변환한 배열도 생성
    const lowercaseHeaders = headers.map(h => h.toLowerCase());
    
    // Check for specific columns to determine data type
    if (
      headers.includes("Latitude") && headers.includes("Longitude") || 
      lowercaseHeaders.includes("latitude") && lowercaseHeaders.includes("longitude") ||
      headers.includes("lat") && headers.includes("lng")
    ) {
      addDataType(DataType.MAP);
      setIsMapDataLoaded(true);
    }
    
    // BMS 데이터 감지 (배터리 관련 필드)
    if (
      headers.some(h => h.includes("BMS_")) || 
      headers.some(h => h.includes("Battery")) ||
      lowercaseHeaders.some(h => h.includes("battery")) ||
      lowercaseHeaders.some(h => h.includes("volt")) ||
      lowercaseHeaders.some(h => h.includes("soc"))
    ) {
      addDataType(DataType.CAN_BMS);
    }
    
    // MPPT 데이터 감지 (전원/태양광 관련 필드)
    if (
      headers.some(h => h.includes("MPPT_")) || 
      headers.some(h => h.includes("Array")) ||
      lowercaseHeaders.some(h => h.includes("solar")) ||
      lowercaseHeaders.some(h => h.includes("power")) ||
      lowercaseHeaders.some(h => h.includes("current")) ||
      lowercaseHeaders.some(h => h.includes("voltage"))
    ) {
      addDataType(DataType.CAN_MPPT);
    }
    
    // 속도 데이터 감지
    if (
      headers.includes("VehicleVelocity") || 
      headers.includes("Speed") ||
      lowercaseHeaders.includes("speed") ||
      lowercaseHeaders.includes("velocity") ||
      lowercaseHeaders.includes("acceleration") ||
      lowercaseHeaders.some(h => h.includes("km/h"))
    ) {
      addDataType(DataType.CAN_VELOCITY);
    }
    
    // 일사량 데이터 감지
    if (
      headers.includes("Irradiance") || 
      headers.includes("SolarIrradiance") ||
      lowercaseHeaders.includes("irradiance") ||
      lowercaseHeaders.includes("radiation") ||
      lowercaseHeaders.some(h => h.includes("solar") && h.includes("intensity"))
    ) {
      addDataType(DataType.MS60S_IRRADIANCE);
    }
    
    // 기울기 데이터 감지
    if (
      headers.includes("Tilt") || 
      headers.includes("PanelTilt") ||
      lowercaseHeaders.includes("tilt") ||
      lowercaseHeaders.includes("angle") ||
      lowercaseHeaders.includes("inclination")
    ) {
      addDataType(DataType.MS60S_TILT);
    }
    
    // 온도 데이터 감지
    if (
      headers.includes("Temperature") || 
      headers.includes("AmbientTemp") ||
      lowercaseHeaders.includes("temperature") ||
      lowercaseHeaders.includes("temp") ||
      lowercaseHeaders.some(h => h.includes("celsius")) ||
      lowercaseHeaders.some(h => h.includes("fahrenheit"))
    ) {
      addDataType(DataType.MS60S_TEMPERATURE);
    }
    
    // 헤더를 찾지 못했을 때 보안 조치: data 자체를 확인
    // Timestamp 필드가 있고 다른 데이터가 숫자 형식이면 CAN 데이터로 간주할 수 있음
    if (headers.includes("Timestamp") && availableDataTypes.length === 0) {
      // 기본값으로 모든 CAN 데이터 타입 추가
      addDataType(DataType.CAN_BMS);
      addDataType(DataType.CAN_MPPT);
      addDataType(DataType.CAN_VELOCITY);
      console.log("Added default CAN data types as fallback");
    }
  };

  // Automatically load map.csv file when the application starts
  useEffect(() => {
    const loadMapData = async () => {
      try {
        const response = await fetch('/map.csv');
        
        if (!response.ok) {
          console.error("Failed to load map.csv:", response.statusText);
          return;
        }
        
        const csvText = await response.text();
        
        Papa.parse<MapDataRow>(csvText, {
          header: true,
          skipEmptyLines: "greedy",
          dynamicTyping: true,
          complete: (result) => {
            if (result.data && result.data.length > 0) {
              // Map 데이터를 데이터셋에 추가
              addDataSet({
                type: 'map',
                fileName: 'map.csv',
                data: result.data as unknown as DataRow[]
              });
              
              addDataType(DataType.MAP);
              setIsMapDataLoaded(true);
              console.log("Map data automatically loaded");
            }
          },
          error: (error: Error) => {
            console.error("Failed to parse map.csv:", error);
          },
        });
      } catch (error) {
        console.error("Error loading map.csv:", error);
      }
    };

    // Load map data on component mount
    loadMapData();
  }, []);

  // Update data types when new data is loaded (not just currentData changes)
  useEffect(() => {
    if (currentData.length > 0) {
      const headers = Object.keys(currentData[0] || {});
      detectDataType(headers);
    }
  }, [currentData]);

  return (
    <DataContext.Provider 
      value={{ 
        currentData, 
        setCurrentData,
        dataSets,
        addDataSet,
        clearDataSets,
        selectDataSet,
        isMapDataLoaded, 
        setIsMapDataLoaded,
        availableDataTypes,
        setAvailableDataTypes,
        hasDataType,
        addDataType,
        removeDataType
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
