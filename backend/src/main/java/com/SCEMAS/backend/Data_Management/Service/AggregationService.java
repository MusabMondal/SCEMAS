package com.SCEMAS.backend.Data_Management.Service;

import org.springframework.stereotype.Service;
import com.google.cloud.firestore.Firestore;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;

@Service
public class AggregationService() 
{
    private final Firestore firestore;

    public SensorService(Firestore firestore) 
    {
        this.firestore = firestore;
    }

    // Compute Average
    public double computeAverage(List<Map<String, Object>> readings) {
        if (readings == null || readings.isEmpty()) return 0.0;

        double sum = 0;
        int count = 0;

        for (Map<String, Object> r : readings) {
            Number val = (Number) r.get("value");
            if (val != null) {
                sum += val.doubleValue();
                count++;
            }
        }

        return count == 0 ? 0.0 : sum / count;
    }

    // Minimum
    public double computeMinimum(List<Map<String, Object>> readings) {
        return readings.stream()
                .map(r -> (Number) r.get("value"))
                .filter(Objects::nonNull)
                .mapToDouble(Number::doubleValue)
                .min()
                .orElse(0.0);
    }

    // Maximum
    public double computeMaximum(List<Map<String, Object>> readings) {
        return readings.stream()
                .map(r -> (Number) r.get("value"))
                .filter(Objects::nonNull)
                .mapToDouble(Number::doubleValue)
                .max()
                .orElse(0.0);
    }

    // Group by time (hour/day)
    public Map<String, List<Map<String, Object>>> groupByTime(
            List<Map<String, Object>> readings,
            String interval
    ) {
        Map<String, List<Map<String, Object>>> grouped = new HashMap<>();

        for (Map<String, Object> r : readings) {
            Long timestamp = (Long) r.get("timestamp");
            if (timestamp == null) continue;

            Calendar cal = Calendar.getInstance();
            cal.setTimeInMillis(timestamp);

            String key;

            if ("hour".equalsIgnoreCase(interval)) {
                key = cal.get(Calendar.YEAR) + "-" +
                      cal.get(Calendar.MONTH) + "-" +
                      cal.get(Calendar.DAY_OF_MONTH) + " " +
                      cal.get(Calendar.HOUR_OF_DAY);
            } else if ("day".equalsIgnoreCase(interval)) {
                key = cal.get(Calendar.YEAR) + "-" +
                      cal.get(Calendar.MONTH) + "-" +
                      cal.get(Calendar.DAY_OF_MONTH);
            } else {
                key = "unknown";
            }

            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(r);
        }

        return grouped;
    }

}
