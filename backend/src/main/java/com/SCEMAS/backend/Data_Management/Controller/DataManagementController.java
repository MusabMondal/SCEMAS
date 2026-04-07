package com.SCEMAS.backend.Data_Management.Controller;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SCEMAS.backend.Data_Management.Service.DataManager;

@RestController
@RequestMapping("/api/data-management")
public class DataManagementController {

    private final DataManager dataManager;

    public DataManagementController(DataManager dataManager) {
        this.dataManager = dataManager;
    }

    @GetMapping("/aggregation/{stationId}/5mins")
    public List<Map<String, Object>> getAggregatedDataForStation5min(
            @PathVariable String stationId,
            @RequestParam String indicatorType
    ) {
        return dataManager.getFiveMinuteAggregates(stationId, indicatorType);
    }

    @GetMapping("/aggregation/{stationId}/60mins")
    public List<Map<String, Object>> getAggregatedDataForStation60min(
            @PathVariable String stationId,
            @RequestParam String indicatorType
    ) {
        return dataManager.getSixtyMinuteAggregatesFromFiveMinuteBuckets(stationId, indicatorType);
    }
}