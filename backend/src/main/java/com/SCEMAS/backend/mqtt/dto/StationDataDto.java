package com.SCEMAS.backend.mqtt.dto;

import java.util.List;

public class StationDataDto {

    private String stationId;
    private long latitude;
    private long longitude;
    private List<SensorReadingDto> sensorReading;

    public StationDataDto() {
    }

    public long getLatitude() {
        return latitude;
    }

    public void setLatitude(long latitude) {
        this.latitude = latitude;
    }

    public long getLongitude() {
        return longitude;
    }

    public void setLongitude(long longitude) {
        this.longitude = longitude;
    }

    public String getStationId() {
        return stationId;
    }

    public void setStationId(String stationId) {
        this.stationId = stationId;
    }

    public List<SensorReadingDto> getSensorReading() {
        return sensorReading;
    }

    public void setSensorReading(List<SensorReadingDto> sensorReading) {
        this.sensorReading = sensorReading;
    }

}
