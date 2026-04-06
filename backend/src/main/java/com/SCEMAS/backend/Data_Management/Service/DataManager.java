package com.SCEMAS.backend.Data_Management.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.stereotype.Service;

@Service
public class DataManager {


    private final Firestore db;
    private static final int BUCKET_SIZE_SECONDS = 60;

    public DataManager(Firestore firestore) 
    {
        this.db = firestore;
    }


    public Map<String,Object> aggregateData(String dataType, String intervalRange, String stationID) 
    {
        try
        {
            int intervalMinutes = parseIntervalMinutes(intervalRange);
            long nowEpochSeconds = System.currentTimeMillis() / 1000;
            long windowStartEpoch = nowEpochSeconds - (intervalMinutes * 60L);
            long startBucket = alignToBucket(windowStartEpoch);
            long endBucket = alignToBucket(nowEpochSeconds);

            ApiFuture<QuerySnapshot> future = db.collection("aggregated_buckets")
                .whereEqualTo("stationId", stationID)
                .whereEqualTo("indicatorType", dataType)
                .whereGreaterThanOrEqualTo("bucketStartEpoch", startBucket)
                .whereLessThanOrEqualTo("bucketStartEpoch", endBucket)
                .get();

            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            documents.sort(Comparator.comparingLong(doc -> doc.getLong("bucketStartEpoch") == null ? 0L : doc.getLong("bucketStartEpoch")));

            double weightedSum = 0.0;
            long totalCount = 0L;
            Double min = null;
            Double max = null;

            for (QueryDocumentSnapshot document : documents) {
                Number bucketSum = document.getDouble("sum");
                Long bucketCount = document.getLong("count");
                Number bucketMin = document.getDouble("min");
                Number bucketMax = document.getDouble("max");

                if (bucketSum == null || bucketCount == null || bucketCount == 0L) {
                    continue;
                }

                weightedSum += bucketSum.doubleValue();
                totalCount += bucketCount;

                if (bucketMin != null) {
                    min = min == null ? bucketMin.doubleValue() : Math.min(min, bucketMin.doubleValue());
                }
                if (bucketMax != null) {
                    max = max == null ? bucketMax.doubleValue() : Math.max(max, bucketMax.doubleValue());
                }
            }

            Map<String,Object> aggregationResult = new HashMap<>();
            aggregationResult.put("stationId", stationID);
            aggregationResult.put("dataType", dataType);
            aggregationResult.put("intervalMinutes", intervalMinutes);
            aggregationResult.put("windowStartEpoch", windowStartEpoch);
            aggregationResult.put("windowEndEpoch", nowEpochSeconds);
            aggregationResult.put("samples", totalCount);
            aggregationResult.put("average", totalCount == 0L ? 0.0 : weightedSum / totalCount);
            aggregationResult.put("minimum", min == null ? 0.0 : min);
            aggregationResult.put("maximum", max == null ? 0.0 : max);
            aggregationResult.put("updatedAt", Timestamp.now());

            String aggregateDocId = stationID + "_" + dataType + "_" + intervalMinutes + "m";
            db.collection("aggregated_data").document(aggregateDocId).set(aggregationResult);

        return aggregationResult;

        }catch (Exception e) {
                System.out.println("Error Aggregating Data");
                e.printStackTrace();
                return new HashMap<>();
            }

    }

    public void updateAggregationBucket(String stationId, String indicatorType, Object valueRaw, Object timestampRaw) {
        if (stationId == null || indicatorType == null || valueRaw == null) {
            return;
        }
        if (!(valueRaw instanceof Number)) {
            return;
        }

        Double value = ((Number) valueRaw).doubleValue();
        long readingEpochSeconds = extractEpochSeconds(timestampRaw);
        long bucketStart = alignToBucket(readingEpochSeconds);
        String bucketId = stationId + "_" + indicatorType + "_" + bucketStart;

        try {
            db.runTransaction(transaction -> {
                DocumentSnapshot snapshot = transaction.get(db.collection("aggregated_buckets").document(bucketId)).get();
                long existingCount = snapshot.exists() ? snapshot.getLong("count") == null ? 0L : snapshot.getLong("count") : 0L;
                double existingSum = snapshot.exists() ? snapshot.getDouble("sum") == null ? 0.0 : snapshot.getDouble("sum") : 0.0;
                double existingMin = snapshot.exists() && snapshot.getDouble("min") != null ? snapshot.getDouble("min") : value;
                double existingMax = snapshot.exists() && snapshot.getDouble("max") != null ? snapshot.getDouble("max") : value;

                Map<String, Object> updatedDoc = new HashMap<>();
                updatedDoc.put("stationId", stationId);
                updatedDoc.put("indicatorType", indicatorType);
                updatedDoc.put("bucketStartEpoch", bucketStart);
                updatedDoc.put("bucketEndEpoch", bucketStart + BUCKET_SIZE_SECONDS);
                updatedDoc.put("count", existingCount + 1);
                updatedDoc.put("sum", existingSum + value);
                updatedDoc.put("min", Math.min(existingMin, value));
                updatedDoc.put("max", Math.max(existingMax, value));
                updatedDoc.put("updatedAt", Timestamp.now());

                transaction.set(db.collection("aggregated_buckets").document(bucketId), updatedDoc);
                return null;
            }).get();

            // Best-effort cleanup to keep buckets compact (~25h history).
            long threshold = alignToBucket((System.currentTimeMillis() / 1000) - (25L * 3600L));
            db.collection("aggregated_buckets")
                .whereEqualTo("stationId", stationId)
                .whereEqualTo("indicatorType", indicatorType)
                .whereLessThan("bucketStartEpoch", threshold)
                .get()
                .get()
                .getDocuments()
                .forEach(doc -> doc.getReference().delete());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            System.out.println("Error updating aggregation bucket");
            e.printStackTrace();
        } catch (ExecutionException e) {
            System.out.println("Error updating aggregation bucket");
            e.printStackTrace();
        } catch (Exception e) {
            System.out.println("Error updating aggregation bucket");
            e.printStackTrace();
        }
    }


    public List<Map<String, Object>> getAggregatedData(String aggregatedDataType) 
    {
        try{
        // Implementation for fetching aggregated data
        // GIVE IT A DATATYPE I.E> TEMPERATURE, RETURN ALL ASSOCIATED AGGREGATES


        ApiFuture<QuerySnapshot> future = db.collection("aggregated_data")
        .whereEqualTo("dataType", aggregatedDataType)
        .get();

            List<QueryDocumentSnapshot> documents = future.get().getDocuments();
            List<Map<String,Object>> result = new ArrayList<>();
        
        for (QueryDocumentSnapshot document : documents) 
        {
            result.add(document.getData());
        }
        
        // Retrieve aggregated data from database
        return result;

        }catch (Exception e) 
            {
                    System.out.println("Error Getting Aggregated Data");
                    return new ArrayList<>();
            }
    }

    private int parseIntervalMinutes(String intervalRange) {
        if (intervalRange == null || intervalRange.isBlank()) {
            return 5;
        }

        String normalized = intervalRange.trim().toLowerCase();
        if (normalized.equals("five_minutes") || normalized.equals("5mins") || normalized.equals("5min") || normalized.equals("5m")) {
            return 5;
        }
        if (normalized.equals("sixty_minutes") || normalized.equals("60mins") || normalized.equals("60min") || normalized.equals("60m") || normalized.equals("hourly") || normalized.equals("1h")) {
            return 60;
        }

        String numeric = normalized.replaceAll("[^0-9]", "");
        if (!numeric.isBlank()) {
            try {
                int parsed = Integer.parseInt(numeric);
                return parsed > 0 ? parsed : 5;
            } catch (NumberFormatException ignored) {
                return 5;
            }
        }

        return 5;
    }

    private long extractEpochSeconds(Object timestampRaw) {
        if (timestampRaw instanceof Number) {
            long raw = ((Number) timestampRaw).longValue();
            return raw > 1_000_000_000_000L ? raw / 1000L : raw;
        }
        if (timestampRaw instanceof String) {
            String ts = ((String) timestampRaw).trim();
            try {
                long raw = Long.parseLong(ts);
                return raw > 1_000_000_000_000L ? raw / 1000L : raw;
            } catch (NumberFormatException ignored) {
                try {
                    return java.time.Instant.parse(ts).getEpochSecond();
                } catch (Exception ignoredAgain) {
                    return System.currentTimeMillis() / 1000L;
                }
            }
        }
        return System.currentTimeMillis() / 1000L;
    }

    private long alignToBucket(long epochSeconds) {
        return (epochSeconds / BUCKET_SIZE_SECONDS) * BUCKET_SIZE_SECONDS;
    }


}
