package com.SCEMAS.backend.Data_Management.Service;

import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

@Service
public class AggregationService
{
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
    public double computeMinimum(List<Map<String, Object>> readings) 
    {
        if (readings == null || readings.isEmpty()) 
        {
        return 0.0;
        }

        Double min = null;

        for (Map<String, Object> reading : readings) 
        {
            Object val = reading.get("value");

            if (val instanceof Number) {
                double num = ((Number) val).doubleValue();

                if (min == null || num < min) {
                    min = num;
                }
            }
        }
        return min == null ? 0.0 : min;
    }



    // Maximum
    public double computeMaximum(List<Map<String, Object>> readings) 
    {
        if (readings == null || readings.isEmpty()) {
            return 0.0;
        }

        Double max = null;

        for (Map<String, Object> reading : readings) {
            Object val = reading.get("value");

            if (val instanceof Number) {
                double num = ((Number) val).doubleValue();

                if (max == null || num > max) {
                    max = num;
                }
            }
        }
        return max == null ? 0.0 : max;
    }

}
