package com.SCEMAS.backend.Data_Management.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.SCEMAS.backend.Data_Management.Service.DataManager;

@RestController
public class DataManagementController {

    private final DataManager dataService;

    public DataManagementController(DataManager dataMan)
    {
        this.dataService = dataMan;
    }

    @GetMapping("/data-management/{stationId}/{days}")
    public String getDataForStationAndDays(@PathVariable String stationId, @PathVariable int days) {
        // Implementation for fetching data for the given station ID and days
        return "Data for station: " + stationId + ", Days: " + days;
    }
    
}
