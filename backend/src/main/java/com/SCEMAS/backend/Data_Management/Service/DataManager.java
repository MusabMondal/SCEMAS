package com.SCEMAS.backend.Data_Management.Service;

import java.util.HashMap;
import java.util.Map;

public class DataManager {

// note: email i gave for firebase didnt work, ask for perm. at meeting; placeholder "fields" used for parsing
// replace station with actual name of database

    public void aggregateData(String fields) 
    {
        // retrieve data FOR aggregation

        Firestore db = FirestoreClient.getFirestore(); // makes firedb instance
        ApiFuture<QuerySnapshot> future = db.collection("station").select(fields).get();
        List<QueryDocumentSnapshot> documents = future.get().getDocuments();

        // Implementation for data aggregation


        // Store aggregated data in *database*
        Map<String, Object> user = new HashMap<>();
        user.put("name", "Alice");
        user.put("age", 25);

ApiFuture<WriteResult> future =
    db.collection("users").document("user1").set(user);
    }

    public void getAggregatedData() {
        // Implementation for fetching aggregated data
        // Retrieve aggregated data from database
    }

}
