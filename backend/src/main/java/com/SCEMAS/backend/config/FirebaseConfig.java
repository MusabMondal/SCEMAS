package com.SCEMAS.backend.config;

import java.io.InputStream;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;

@Configuration
public class FirebaseConfig {

    @Bean
    public FirebaseApp firebaseApp() throws Exception {

        InputStream serviceAccount = getClass()
                .getClassLoader()
                .getResourceAsStream("scemasFirbaseKey.json");

        if (serviceAccount == null) {
            throw new RuntimeException("firebase-key.json not found");
        }

        FirebaseOptions options = FirebaseOptions.builder()
                .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                .build();

        FirebaseApp app = FirebaseApp.initializeApp(options);

        System.out.println("Firebase bean initialized");

        return app;
    }
}