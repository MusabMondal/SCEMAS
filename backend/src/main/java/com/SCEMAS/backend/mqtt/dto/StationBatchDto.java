package com.SCEMAS.backend.mqtt.dto;

import java.util.List;

public class StationBatchDto {

    private long timestamp;   // better as long (not String)
    private List<StationDataDto> stations;

    public StationBatchDto() {
    }

    public long getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(long timestamp) {
        this.timestamp = timestamp;
    }

    

    public List<StationDataDto> getStations() {
        return stations;
    }

    public void setStations(List<StationDataDto> stations) {
        this.stations = stations;
    }
}