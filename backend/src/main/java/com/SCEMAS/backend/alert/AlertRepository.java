package com.SCEMAS.backend.alert;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AlertRepository extends JpaRepository<Alert, Long> {
    List<Alert> findByStatus(String status);
    List<Alert> findBySensorId(String sensorId);
    List<Alert> findByStationId(String stationId);
}
