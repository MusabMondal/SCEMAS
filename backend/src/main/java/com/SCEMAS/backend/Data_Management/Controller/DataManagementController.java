package com.SCEMAS.backend.Data_Management.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class DataManagementController {

    @GetMapping("/data-management/aggregation/{stationID}/5mins")
    public String getAggregatedDataForStation5min(@PathVariable String stationId) 
    {
        // Implementation for fetching data for the given station ID and days
        return "Data for station: " + stationId + " within the past 5 minutes.";
    }

    @GetMapping("/data-management/aggregation/{stationID}/60mins")
    public String getAggregatedDataForStation60min(@PathVariable String stationId) 
    {
        // Implementation for fetching data for the given station ID and days
        return "Data for station: " + stationId + " within the past 60 minutes.";
    }
    
}
