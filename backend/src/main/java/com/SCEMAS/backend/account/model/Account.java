package com.SCEMAS.backend.account.model;


import jakarta.persistence.*;

@Entity
public class Account {
    @Id
    private String firebaseUid;

    private String name;

    @Column(unique = true)
    private String email;

    @Enumerated(EnumType.STRING)
    private AccountType type;


    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public AccountType getType() { return type; }
    public void setType(AccountType type) { this.type = type; }

    public String getFirebaseUid() { return firebaseUid; }
    public void setFirebaseUid(String firebaseUid) { this.firebaseUid = firebaseUid; }

}