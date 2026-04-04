package com.SCEMAS.backend.mqtt.dto;

import java.util.List;

public class StationDataDto {

    private String stationId;
    private double latitude;
    private double longitude;
    private List<SensorReadingDto> sensorReading;

    public StationDataDto() {
    }

    public double getLatitude() {
        return latitude;
    }

    public void setLatitude(double latitude) {
        this.latitude = latitude;
    }

    public double getLongitude() {
        return longitude;
    }

    public void setLongitude(double longitude) {
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
