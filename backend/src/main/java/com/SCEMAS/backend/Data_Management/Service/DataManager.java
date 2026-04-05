package com.SCEMAS.backend.Data_Management.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;

public class DataManager {


    private final Firestore db;

    public DataManager(Firestore firestore) 
    {
        this.db = firestore;
    }


    public void aggregateData(String dataType, Double currentTimestamp, String intervalRange, String stationID) 
    {
        // data type: what data is being aggregated; i.e. temp, humidity,pressure...
        // retrieve data FOR aggregation
        // NOTE: AGGREGATION FOR ONE STATION
        try
        {
        // -----------------------------------------------------------------------------------------------
            
        // aggregations should have options for 5-min and 60-min ranges.

        double minusFiveTimestamp = currentTimestamp - 300;
        double minusSixtyTimestamp = currentTimestamp - 3600;

        ApiFuture<QuerySnapshot> future;
        if(intervalRange.equalsIgnoreCase("five_minutes"))
        {
            future = db.collection("sensor_readings") // from db sensor_readings
            .whereEqualTo("stationID", stationID) // station ID matches
            .whereGreaterThan("timestamp", minusFiveTimestamp) // interval of data
            .whereEqualTo("indicatorType", dataType) // correct indicatorType
            .get();
        }
        else // assumes hourly aggregation
        {
            future = db.collection("sensor_readings").whereEqualTo("stationID", stationID).whereGreaterThan("timestamp", minusSixtyTimestamp ).whereEqualTo("indicatorType", dataType).get();
        }

        // 1. GET DATA CORRESPONDING TO INDICATOR TYPE
            List<QueryDocumentSnapshot> documents = future.get().getDocuments();

            List<Map<String,Object>> dataResult = new ArrayList<>();

            AggregationService aggregate = new AggregationService();

        // -----------------------------------------------------------------------------------------------

            // 2. AGGREGATE DATA, PUT IN LIST
            for (QueryDocumentSnapshot document : documents) 
                {
                    dataResult.add(document.getData());
                }

            // Implementation for data aggregation ; calls aggregation service and returns value:
            Map<String,Object> aggregationResult = new HashMap<>();
            aggregationResult.put("average",aggregate.computeAverage(dataResult));
            aggregationResult.put("minimum",aggregate.computeMinimum(dataResult));
            aggregationResult.put("maximum",aggregate.computeMaximum(dataResult));
            
            if(intervalRange.equalsIgnoreCase("five_minutes")) aggregationResult.put("intervalMinutes",5);
            else aggregationResult.put("intervalMinutes",60);

            // Store most recent aggregated data in *database*
            db.collection("aggregated_data").document(stationID + "_" + dataType).set(aggregationResult);

            // will be assuming some structure:
            /* - aggregated_data
                    - station1_temperature
                            // min
                            // max
                            // average
                            // interval: ?
            */ 
        

        }catch (Exception e) {
                System.out.println("Error Aggregating Data");
            }

    }


    public List<Map<String, Object>> getAggregatedData(String aggregatedDataType) 
    {
        try{
        // Implementation for fetching aggregated data
        // GIVE IT A DATATYPE I.E> TEMPERATURE, RETURN ALL ASSOCIATED AGGREGATES


        ApiFuture<QuerySnapshot> future = db.collection("aggregated_data")
        .whereEqualTo("dataType", aggregatedDataType)
        .get();

            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            List<Map<String,Object>> result = new ArrayList<>();
        
        for (QueryDocumentSnapshot document : documents) 
        {
            result.add(document.getData());
        }
        
        // Retrieve aggregated data from database
        return result;

        }catch (Exception e) 
            {
                    System.out.println("Error Getting Aggregated Data");
                    return new ArrayList<>();
            }
    }


}
