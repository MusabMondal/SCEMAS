package com.SCEMAS.backend.Data_Management.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

import com.google.cloud.firestore.Firestore;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;

public class DataManager {


    private final Firestore db;

    public DataManager(Firestore firestore) 
    {
        this.db = firestore;
    }



    public void aggregateData(String dataType) 
    {
        // data type: what data is being aggregated; i.e. temp, humidity,pressure...
        // retrieve data FOR aggregation
        try
        {
        // -----------------------------------------------------------------------------------------------
            
        // 1. GET DATA CORRESPONDING TO INDICATOR TYPE

            ApiFuture<QuerySnapshot> future = db.collection("sensor_readings").whereEqualTo("indicatorType", dataType).get();
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
            aggregationResult.put("groupByTime",aggregate.groupByTime(dataResult, "time?"));
            
            // NOTE: time?

            // Store aggregated data in *database*
            db.collection("aggregated_data").add(aggregationResult);

            // will be assuming some structure:
            /* - aggregatedData
                    - temperature
                        // min
                        // max
                        // average
                        // interval: 
                    - humidity
                        // min
                        // max
                        // average
                        // interval:
                    ...
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
        .whereEqualTo("indicatorType", aggregatedDataType)
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
