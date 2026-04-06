package com.SCEMAS.backend.Data_Management.Controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SCEMAS.backend.Data_Management.Service.DataManager;
import org.springframework.web.bind.annotation.RequestBody;
import com.SCEMAS.backend.Data_Management.dto.DataManagementDto;

@RestController
@RequestMapping("/api/")
public class DataManagementController {

    private final DataManager dataManager;

    public DataManagementController(DataManager dataManager) {
        this.dataManager = dataManager;
    }


    @GetMapping("/data-management/aggregation/5mins")
    public Map<String,Object> getAggregatedDataForStation5min(@RequestBody DataManagementDto request) 
    {
        // Implementation for fetching data for the given station ID and days
        Map<String,Object> aggregatedData = dataManager.aggregateData(request.getIndicatorType(),request.getAggregationInterval(), request.getStationId());
        return aggregatedData;
    }

    @GetMapping("/data-management/aggregation/{stationID}/60mins")
    public String getAggregatedDataForStation60min(@PathVariable String stationId) 
    {
        // Implementation for fetching data for the given station ID and days
        return "Data for station: " + stationId + " within the past 60 minutes.";
    }
    
}
