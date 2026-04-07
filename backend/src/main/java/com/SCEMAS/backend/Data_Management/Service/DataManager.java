package com.SCEMAS.backend.Data_Management.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

import com.google.api.core.ApiFuture;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import org.springframework.stereotype.Service;

@Service
public class DataManager {

    private final Firestore db;

    // 5 minutes
    private static final long FIVE_MIN_BUCKET_SECONDS = 300L;

    public DataManager(Firestore firestore) {
        this.db = firestore;
    }

    /**
     * Called immediately when a new MQTT reading arrives.
     * Updates the precomputed 5-minute aggregate bucket.
     */
    public void updateFiveMinuteAggregation(
            String stationId,
            String indicatorType,
            double value,
            Object timestampRaw
    ) {
        if (stationId == null || stationId.isBlank()) return;
        if (indicatorType == null || indicatorType.isBlank()) return;

        long readingEpochSeconds = extractEpochSeconds(timestampRaw);
        long bucketStartEpoch = alignToFiveMinuteBucket(readingEpochSeconds);
        long bucketEndEpoch = bucketStartEpoch + FIVE_MIN_BUCKET_SECONDS;

        String docId = stationId + "_" + indicatorType + "_" + bucketStartEpoch;
        DocumentReference docRef = db.collection("aggregated_5min").document(docId);

        try {
            db.runTransaction(transaction -> {
                DocumentSnapshot snapshot = transaction.get(docRef).get();

                long existingCount = 0L;
                double existingSum = 0.0;
                double existingMin = value;
                double existingMax = value;

                if (snapshot.exists()) {
                    Long count = snapshot.getLong("count");
                    Double sum = snapshot.getDouble("sum");
                    Double min = snapshot.getDouble("min");
                    Double max = snapshot.getDouble("max");

                    existingCount = count != null ? count : 0L;
                    existingSum = sum != null ? sum : 0.0;
                    existingMin = min != null ? min : value;
                    existingMax = max != null ? max : value;
                }

                Map<String, Object> updated = new HashMap<>();
                updated.put("stationId", stationId);
                updated.put("indicatorType", indicatorType);
                updated.put("bucketStartEpoch", bucketStartEpoch);
                updated.put("bucketEndEpoch", bucketEndEpoch);
                updated.put("count", existingCount + 1);
                updated.put("sum", existingSum + value);
                updated.put("min", Math.min(existingMin, value));
                updated.put("max", Math.max(existingMax, value));
                updated.put("average", (existingSum + value) / (existingCount + 1));
                updated.put("updatedAt", Timestamp.now());

                transaction.set(docRef, updated);

                return null;
            }).get();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while updating 5-minute aggregate", e);
        } catch (ExecutionException e) {
            throw new RuntimeException("Failed to update 5-minute aggregate", e);
        }
    }

    /**
     * Read all saved 5-minute intervals for one station + indicator.
     * This is what your endpoint should call.
     */
    public List<Map<String, Object>> getFiveMinuteAggregates(String stationId, String indicatorType) {
        try {
            ApiFuture<QuerySnapshot> future = db.collection("aggregated_5min")
                    .whereEqualTo("stationId", stationId)
                    .whereEqualTo("indicatorType", indicatorType)
                    .get();

            List<QueryDocumentSnapshot> docs = future.get().getDocuments();
            List<Map<String, Object>> result = new ArrayList<>();

            for (QueryDocumentSnapshot doc : docs) {
                result.add(doc.getData());
            }

            result.sort(Comparator.comparingLong(
                    m -> ((Number) m.getOrDefault("bucketStartEpoch", 0L)).longValue()
            ));

            return result;
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch 5-minute aggregates", e);
        }
    }

    /**
     * Optional: build 60-minute aggregates from the already saved 5-minute buckets.
     * This avoids scanning raw readings.
     */
    public List<Map<String, Object>> getSixtyMinuteAggregatesFromFiveMinuteBuckets(String stationId, String indicatorType) {
        List<Map<String, Object>> fiveMinBuckets = getFiveMinuteAggregates(stationId, indicatorType);
        Map<Long, Map<String, Object>> hourlyBuckets = new HashMap<>();

        for (Map<String, Object> bucket : fiveMinBuckets) {
            long bucketStart = ((Number) bucket.get("bucketStartEpoch")).longValue();
            long hourStart = alignToSixtyMinuteBucket(bucketStart);

            long count = ((Number) bucket.get("count")).longValue();
            double sum = ((Number) bucket.get("sum")).doubleValue();
            double min = ((Number) bucket.get("min")).doubleValue();
            double max = ((Number) bucket.get("max")).doubleValue();

            Map<String, Object> existing = hourlyBuckets.get(hourStart);
            if (existing == null) {
                existing = new HashMap<>();
                existing.put("stationId", stationId);
                existing.put("indicatorType", indicatorType);
                existing.put("bucketStartEpoch", hourStart);
                existing.put("bucketEndEpoch", hourStart + 3600L);
                existing.put("count", count);
                existing.put("sum", sum);
                existing.put("min", min);
                existing.put("max", max);
                hourlyBuckets.put(hourStart, existing);
            } else {
                long existingCount = ((Number) existing.get("count")).longValue();
                double existingSum = ((Number) existing.get("sum")).doubleValue();
                double existingMin = ((Number) existing.get("min")).doubleValue();
                double existingMax = ((Number) existing.get("max")).doubleValue();

                existing.put("count", existingCount + count);
                existing.put("sum", existingSum + sum);
                existing.put("min", Math.min(existingMin, min));
                existing.put("max", Math.max(existingMax, max));
            }
        }

        List<Map<String, Object>> result = new ArrayList<>(hourlyBuckets.values());
        result.sort(Comparator.comparingLong(
                m -> ((Number) m.getOrDefault("bucketStartEpoch", 0L)).longValue()
        ));

        for (Map<String, Object> bucket : result) {
            long count = ((Number) bucket.get("count")).longValue();
            double sum = ((Number) bucket.get("sum")).doubleValue();
            bucket.put("average", count == 0 ? 0.0 : sum / count);
        }

        return result;
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
                    return Instant.parse(ts).getEpochSecond();
                } catch (Exception ignoredAgain) {
                    return System.currentTimeMillis() / 1000L;
                }
            }
        }

        return System.currentTimeMillis() / 1000L;
    }

    private long alignToFiveMinuteBucket(long epochSeconds) {
        return (epochSeconds / FIVE_MIN_BUCKET_SECONDS) * FIVE_MIN_BUCKET_SECONDS;
    }

    private long alignToSixtyMinuteBucket(long epochSeconds) {
        return (epochSeconds / 3600L) * 3600L;
    }
}