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

    private final Firestore db = FirestoreClient.getFirestore();

    // Create or update account in Firebase
    private Account saveAccount(Account account) throws InterruptedException, ExecutionException {
        DocumentReference docRef = db.collection("accounts").document(account.getFirebaseUid());
        docRef.set(account).get();
        return account;
    }

    private AccountType parseAccountType(String type)  {
        try {
            return AccountType.valueOf(type.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Invalid account type");
        }
    }

    // Used to validate which account can access certain features such as "getAccount"
    private void validateAccess(String requesterUid, AccountType requesterRole, String targetUid) {
        if (requesterRole != AccountType.SYSTEM_ADMINISTRATOR && !requesterUid.equals(targetUid)) {
            throw new RuntimeException("Unauthorized");
        }
    }

    // Get account by Firebase UID
    public Account getAccount(String requesterUid, AccountType requesterRole, String targetUid) throws InterruptedException, ExecutionException {

        validateAccess(requesterUid, requesterRole, targetUid);

        DocumentReference docRef = db.collection("accounts").document(targetUid);
        Account account = docRef.get().get().toObject(Account.class);

        if (account == null) {
            throw new RuntimeException("Account not found");
        }

        return account;
    }

    public void deleteAccount(String requesterUid, AccountType requesterRole, String targetUid) throws InterruptedException, ExecutionException {

        validateAccess(requesterUid, requesterRole, targetUid);

        db.collection("accounts").document(targetUid).delete().get();

        // TODO: audit log
    }

    // List all accounts
    public List<Account> getAllAccounts(AccountType requesterRole)
            throws InterruptedException, ExecutionException {

        if (requesterRole != AccountType.SYSTEM_ADMINISTRATOR) {
            throw new RuntimeException("Unauthorized");
        }

        List<Account> accounts = new ArrayList<>();
        db.collection("accounts").get().get().getDocuments()
                .forEach(doc -> accounts.add(doc.toObject(Account.class)));

        return accounts;
    }

    // Creating a new account
    public Account createAccount(String name, String email, String type, String firebaseUid) throws InterruptedException, ExecutionException {

        Account account = new Account();
        account.setName(name);
        account.setEmail(email);
        account.setType(parseAccountType(type));
        account.setFirebaseUid(firebaseUid);

        // TODO: audit log

        return saveAccount(account);
    }

    // Updating an account
    public Account updateAccount(String requesterUid, AccountType requesterRole, String targetUid, String name, String email, String type)
            throws InterruptedException, ExecutionException {

        validateAccess(requesterUid, requesterRole, targetUid);

        DocumentReference docRef = db.collection("accounts").document(targetUid);
        Account account = docRef.get().get().toObject(Account.class);

        if (account == null) {
            throw new RuntimeException("Account not found");
        }

        account.setName(name);
        account.setEmail(email);
        account.setType(parseAccountType(type));

        // TODO: audit log

        return saveAccount(account);
    }

    // Used by the authentication filter
    public Account getAccountInternal(String firebaseUid)throws InterruptedException, ExecutionException {
        DocumentReference docRef = db.collection("accounts").document(firebaseUid);
        return docRef.get().get().toObject(Account.class);
    }

}
