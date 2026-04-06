package com.SCEMAS.backend.config;

import java.io.InputStream;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp() throws Exception {
        // 1. Check if an app is already initialized to prevent the "DEFAULT already exists" crash
        if (!FirebaseApp.getApps().isEmpty()) {
            return FirebaseApp.getInstance();
        }

        InputStream serviceAccount = getClass()
                .getClassLoader()
                .getResourceAsStream("scemasFirbaseKey.json");

        if (serviceAccount == null) {
            throw new RuntimeException("scemasFirbaseKey.json not found in resources");
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

        FirebaseApp app = FirebaseApp.initializeApp(options);
        System.out.println("Firebase bean initialized");
        return app;
    }

    @Bean
    public Firestore firestore(FirebaseApp firebaseApp) {
        // 2. This creates the 'Firestore' bean that your AlertRepository is looking for
        return FirestoreClient.getFirestore(firebaseApp);
    }
}