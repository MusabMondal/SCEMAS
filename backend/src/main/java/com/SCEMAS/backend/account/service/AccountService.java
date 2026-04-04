package com.SCEMAS.backend.account.service;


import org.springframework.stereotype.Service;
import com.google.cloud.firestore.*;
import com.google.firebase.cloud.FirestoreClient;

import com.SCEMAS.backend.account.model.Account;
import com.SCEMAS.backend.account.model.AccountType;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class AccountService {


    // Create or update account in Firebase
    private Account saveAccount(Account account) throws InterruptedException, ExecutionException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection("accounts").document(account.getFirebaseUid());
        WriteResult result = docRef.set(account).get();
        System.out.println("Update time: " + result.getUpdateTime());
        return account;
    }

    // Get account by Firebase UID
    public Account getAccount(String firebaseUid) throws InterruptedException, ExecutionException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection("accounts").document(firebaseUid);
        return docRef.get().get().toObject(Account.class);
    }

    // Delete account
    public void deleteAccount(String firebaseUid) throws InterruptedException, ExecutionException {
        Firestore db = FirestoreClient.getFirestore();
        DocumentReference docRef = db.collection("accounts").document(firebaseUid);
        docRef.delete().get();
    }

    // List all accounts
    public List<Account> getAllAccounts() throws InterruptedException, ExecutionException {
        Firestore db = FirestoreClient.getFirestore();
        List<Account> accounts = new ArrayList<>();
        db.collection("accounts").get().get().getDocuments()
          .forEach(doc -> accounts.add(doc.toObject(Account.class)));
        return accounts;
    }

    // Convenience methods for your controller
    public Account createAccount(String name, String email, String type, String firebaseUid)
            throws InterruptedException, ExecutionException {
        Account account = new Account();
        account.setName(name);
        account.setEmail(email);
        account.setType(AccountType.valueOf(type.toUpperCase()));
        account.setFirebaseUid(firebaseUid);
        return saveAccount(account);
    }

    public Account updateAccount(String firebaseUid, String name, String email, String type)
            throws InterruptedException, ExecutionException {
        Account account = getAccount(firebaseUid);
        account.setName(name);
        account.setEmail(email);
        account.setType(AccountType.valueOf(type.toUpperCase()));
        return saveAccount(account);
    }
}
