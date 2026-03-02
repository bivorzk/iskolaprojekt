# Adatbázis Dokumentáció

## Az adatbázis célja, funkciója és a benne tárolt információk összefoglalása

Ez az adatbázis egy iskolai büfék rendszer (MERN stack projekt) részét képezi, amely lehetővé teszi a felhasználók (diákok, szülők, tanárok) számára az étkezés megrendelését, kifizetését és értékelését. A rendszer támogatja a felhasználói autentikációt, a menükezelést, rendeléseket, kifizetéseket, hűségprogramokat és biztonsági naplózást. A fő cél az iskolai étkezés hatékony és biztonságos kezelése, beleértve a készletkezelést, értékeléseket és a pénzügyi tranzakciókat. Az adatbázis MongoDB-t használ Mongoose ODM-mel, amely egy NoSQL adatbázis, de sémákkal strukturált. A rendszer Redis-t használ gyorsítótárazáshoz a teljesítmény növelése érdekében.

Az adatbázis-modell típusa: NoSQL (MongoDB), lekérdezési nyelv: JavaScript (Mongoose queries). Kiegészítőként Redis in-memory adatbázis gyorsítótárazáshoz.

## Adatbázis-terv és séma

### Entitások és kapcsolatok (ER modell összefoglaló)

A rendszer fő entitásai és kapcsolataik:

- **User** (Felhasználó): Központi entitás, minden más entitáshoz kapcsolódik.
- **MenuItems** (Menüelemek): Étkezési tételek.
- **Order** (Rendelés): Felhasználók rendelései.
- **OrderItems** (Rendelés tételek): Egy rendeléshez tartozó menüelemek.
- **Payment** (Kifizetés): Pénzügyi tranzakciók.
- **Review** (Értékelés): Menüelemek értékelése (beágyazott MenuItems-ben).
- **DailyMenu** (Napi menü): Iskolai periódusok szerinti menük.
- **ParentStudent** (Szülő-Diák kapcsolat): Szülők és diákok összekapcsolása.
- **SecurityLogs** (Biztonsági naplók): Események naplózása.
- **UserLoyalty** (Hűségprogram): Felhasználók pontjai, kedvezményei és hűségszintje.
- **DeviceSyncSession** (Eszköz szinkronizálási munkamenet): Eszközök közötti kulcs szinkronizálás.
- **Message** (Üzenetek): E2EE chat üzenetek.
- **PreKey** (Előzetes kulcsok): ECDH előzetes kulcsok.
- **StorageBlob** (Tárolási blob): Titkosított üzenet/session történetek.

Kapcsolatok:
- User 1:N Payment, Order, SecurityLogs, UserLoyalty, Message (sender/recipient), PreKey, StorageBlob, DeviceSyncSession (opcionális).
- User 1:N ParentStudent (szülőként vagy diákként).
- MenuItems 1:N OrderItems (beágyazott Order-ben), Review (beágyazott).
- Order 1:N OrderItems (beágyazott).
- DailyMenu 1:N MenuItems (referenciákon keresztül).
- Message 1:1 PreKey (opcionális, X3DH-hez).
- StorageBlob 1:1 User (per blobType és partitionKey).

Nincs relációs adatbázis, így az ER diagram opcionális, de a kapcsolatok referenciákon alapulnak (ObjectId-k).

### Relációs séma (táblázatok részletei)

Az alábbi táblázatokban minden entitás (kollekció) mezőit dokumentálom: név, típus, jelentés/szerep, megszorítások.

#### User (Felhasználók)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| username | String | Felhasználónév | Kötelező, egyedi |
| password | String | Jelszó (hash-elt) | Kötelező |
| email | String | E-mail cím | Kötelező, egyedi, e-mail formátum, trim |
| isVerified | Boolean | E-mail ellenőrzés státusza | Alapértelmezett: false |
| usertype | String | Felhasználó típusa (admin, student, parent, teacher, frozen, editor) | Enum: ['admin', 'student', 'parent', 'teacher', 'frozen', 'editor'], alapértelmezett: 'student' |
| createdAt | Date | Fiók létrehozási dátuma | Alapértelmezett: jelenlegi idő |
| balance | Number | Felhasználó egyenlege alkalmazáson belüli vásárlásokhoz | Alapértelmezett: 0 |
| isBanned | Boolean | Tiltott felhasználó | Alapértelmezett: false |
| banReason | String | Tiltás oka | Opcionális |
| userPersonalInfo | [Subdocument] | Személyes információk (név, születési dátum, osztály, iskola, cím) | Opcionális |
| identity.publicKey | String | E2EE identitás nyilvános kulcs (ECDH P-256 SPKI base64) | Opcionális |
| identity.signingPublicKey | String | E2EE aláíró nyilvános kulcs (ECDSA P-256) | Opcionális |
| identity.keyId | String | Kulcs azonosító (SHA-256 fingerprint) | Opcionális |
| identity.registeredAt | Date | E2EE regisztráció ideje | Opcionális |
| identity.isE2EEEnabled | Boolean | E2EE engedélyezve | Alapértelmezett: false |
| devices | [Array] | Regisztrált eszközök (deviceId, publicKey, label, stb.) | Opcionális |
| recoveryBlob.encryptedData | String | Helyreállítási blob (AES-GCM titkosított) | Opcionális |
| recoveryBlob.iv | String | IV a helyreállítási blob-hoz | Opcionális |
| recoveryBlob.salt | String | Salt a helyreállítási blob-hoz | Opcionális |
| recoveryBlob.storedAt | Date | Helyreállítási blob tárolási ideje | Opcionális |
| encryption.* | Mixed | V1 legacy E2EE mezők (migrációhoz) | Opcionális |

Üzleti szabályok: Minden felhasználónak egyedi felhasználóneve és e-mail címe van. A felhasználók típusa befolyásolja a hozzáférési jogokat (pl. admin mindenhez hozzáfér).

#### Payment (Kifizetések)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Fizető felhasználó | Opcionális |
| amount | Number | Fizetett összeg | Kötelező |
| currency | String | Pénznem (pl. USD, HUF) | Kötelező |
| paymentMethod | String | Fizetési mód | Kötelező |
| status | String | Státusz (Completed, Pending, Failed) | Kötelező, enum: ['Completed', 'Pending', 'Failed'] |
| transactionId | String | Külső tranzakció referencia | Opcionális |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Minden kifizetés egy felhasználóhoz tartozik, de opcionális lehet (pl. vendég kifizetések).

#### MenuItems (Menüelemek)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| name | String | Menüelem neve | Kötelező |
| description | String | Leírás | Kötelező |
| stock | Number | Készlet mennyisége | Kötelező, alapértelmezett: 0 |
| price | Number | Ár | Kötelező |
| category | String | Kategória (Soup, Salad, stb.) | Kötelező, enum: ['Soup', 'Salad', 'MainDish', 'SideDish', 'Snack', 'Dessert', 'Drink', 'Healthy', 'SpecialDiet', 'DailySpecial', 'Other'], alapértelmezett: 'Other' |
| available | Boolean | Elérhetőség | Alapértelmezett: true |
| QRCode | String | QR kód a menüelemhez | Opcionális |
| allergens | [String] | Allergének listája | Alapértelmezett: [] |
| nutritionalInfo.calories | Number | Kalóriák | Opcionális |
| nutritionalInfo.protein | Number | Fehérje | Opcionális |
| nutritionalInfo.carbs | Number | Szénhidrát | Opcionális |
| nutritionalInfo.fat | Number | Zsír | Opcionális |

Üzleti szabályok: A készlet nem lehet negatív; kategóriák alapján szűrhető. Pre-save hook: Ha a készlet <= 0, akkor available = false, különben true.

#### Order (Rendelések)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Rendelő felhasználó | Kötelező |
| items | [OrderItemsScheme] | Rendelés tételei | Kötelező |
| orderDate | Date | Rendelés dátuma | Alapértelmezett: jelenlegi idő |
| status | String | Státusz (Pending, InProgress, Completed, Cancelled) | Kötelező, enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'], alapértelmezett: 'Pending' |
| totalAmount | Number | Teljes összeg | Kötelező |
| pickupTime | Date | Átvétel ideje | Opcionális |
| notes | String | Megjegyzések | Opcionális, alapértelmezett: '' |
| paypalOrderId | String | PayPal rendelés azonosító | Opcionális |
| paymentMethod | String | Fizetési mód | Opcionális |
| transactionId | String | Tranzakció azonosító | Opcionális |
| publicID | String | Nyilvános azonosító | Kötelező, egyedi |

Üzleti szabályok: Minden rendelés egy felhasználóhoz tartozik; státusz változások követik az üzleti folyamatot. Pre-save hook: Ha a rendelés 'Pending' státuszban van és több mint 15 perc telt el a létrehozás óta, automatikusan 'Cancelled'-re változik.

#### OrderItems (Rendelés tételek)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| menuItemId | ObjectId (ref: MenuItems) | Menüelem azonosító | Kötelező |
| orderId | ObjectId (ref: Order) | Rendelés azonosító | Opcionális |
| quantity | Number | Mennyiség | Kötelező, alapértelmezett: 1 |

Üzleti szabályok: Minden tétel egy menüelemhez tartozik; mennyiség pozitív egész szám. Ez a séma be van ágyazva az Order séma items mezőjébe.

#### Review (Értékelések) - Beágyazott MenuItems-ben
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Értékelő felhasználó | Opcionális |
| rating | Number | Értékelés (1-5) | Kötelező, min: 1, max: 5 |
| comment | String | Megjegyzés | Kötelező, maxlength: 500 |
| date | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |
| ipAddress | String | IP cím | Opcionális |
| reported | Boolean | Jelentve | Alapértelmezett: false |
| moderated | Boolean | Moderálva | Alapértelmezett: false |
| moderatorNotes | String | Moderátor jegyzetek | Opcionális |

Üzleti szabályok: Értékelések be vannak ágyazva a MenuItems kollekcióba. Egy felhasználó többször is értékelhet különböző tételeket.

#### DailyMenu (Napi menü)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| date | Date | Dátum | Kötelező |
| schoolPeriod | String | Iskolai periódus (morning, afternoon) | Kötelező, enum: ['morning', 'afternoon'] |
| menuItems | [ObjectId] (ref: MenuItems) | Menüelemek listája | Kötelező |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Napi menük periódusonként készülnek.

#### ParentStudent (Szülő-Diák kapcsolat)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| parentId | ObjectId (ref: User) | Szülő felhasználó | Kötelező |
| studentId | ObjectId (ref: User) | Diák felhasználó | Kötelező |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Szülők több diákhoz is kapcsolódhatnak.

#### SecurityLogs (Biztonsági naplók)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Felhasználó | Opcionális |
| action | String | Akció (pl. LOGIN_SUCCESS) | Kötelező |
| type | String | Típus (INFO, WARNING, ERROR) | Kötelező |
| ipAddress | String | IP cím (Hashelt) | Opcionális |
| Timestamp | Date | Időbélyeg | Alapértelmezett: jelenlegi idő |
| details | String | További információk | Opcionális |
| country | String | Ország | Opcionális |
| CountryCode | String | Országkód | Opcionális |
| currency | String | Pénznem | Opcionális |
| Continent | String | Kontinens | Opcionális |
| IsVPN | Boolean | VPN használat | Opcionális |
| isTor | Boolean | Tor használat | Opcionális |
| isProxy | Boolean | Proxy használat | Opcionális |

Üzleti szabályok: Naplók minden fontos eseményt rögzítenek.

#### UserLoyalty (Hűségprogram)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Felhasználó | Kötelező |
| totalPoints | Number | Összes pont | Alapértelmezett: 0 |
| userTier | String | Felhasználó hűségszintje | Enum: ['none', 'Bronze', 'Silver', 'Gold', 'Platinum'], alapértelmezett: 'none' |
| discounts | String | Kedvezmények listája | [Lásd tábla alatt]: |
| lastUpdated | Date | Utolsó frissítés | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Pontok vásárlások alapján gyűlnek. A hűségszint automatikusan frissül a pontok alapján (50 ponttól Bronze, 250-től Silver, 800-tól Gold, 2000-tól Platinum). Pre-save hook: Tier frissítése a totalPoints alapján. Post-save hook: Ha a tier változott, új kedvezmények hozzáadása a tier alapján (Bronze: 5% healthy; Silver: 10% healthy, 5% drink 90 napig; Gold: 15% healthy, 10% full_meal; Platinum: 20% healthy, 15% general).

A `discounts` mező részletei (tömb elemei):

```javascript
discounts: [{
    type: { type: String, enum: Object.values(DISCOUNT_TYPES), required: true }, // e.g., DISCOUNT_TYPES.HEALTHY
    rate: { type: Number, enum: Object.values(DISCOUNT_RATES), required: true }, // e.g., DISCOUNT_RATES.FIVE
    validUntil: { type: Date, required: false }
}],

const DISCOUNT_RATES = {
  FIVE: 0.05,
  TEN: 0.10,
  FIFTEEN: 0.15,
  TWENTY: 0.20,
  TWENTY_FIVE: 0.25,
};

const DISCOUNT_TYPES = {
  HEALTHY: 'healthy',
  VEGETARIAN: 'vegetarian',
  FULL_MEAL: 'full_meal',
  DRINK: 'drink',
  DESSERT: 'dessert',
  GENERAL: 'general',
};

```

#### DeviceSyncSession (Eszköz szinkronizálási munkamenet)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| responderDeviceId | String | Az eszköz, amely várja a szinkronizálási payload-ot | Kötelező, index |
| initiatorDeviceId | String | Az eszköz, amely feltöltötte a szinkronizálási payload-ot | Opcionális |
| encryptedPayload | String | Titkosított szinkronizálási payload (ECDH + AES-GCM) | Kötelező |
| iv | String | IV az AES-GCM titkosításhoz | Kötelező |
| ephemeralKey | String | Ephemerális ECDH nyilvános kulcs | Kötelező |
| expiresAt | Date | Lejárati idő (10 perc) | Alapértelmezett: jelenlegi idő + 10 perc |

Üzleti szabályok: Ephemerális tábla eszközök közötti kulcs szinkronizáláshoz. TTL index automatikusan törli a dokumentumokat 10 perc után.

#### Message (Üzenetek)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| senderId | ObjectId (ref: User) | Küldő felhasználó | Kötelező |
| recipientId | ObjectId (ref: User) | Címzett felhasználó | Kötelező |
| senderDeviceId | String | Küldő eszköz azonosító | Opcionális |
| recipientDeviceId | String | Címzett eszköz azonosító | Opcionális |
| schemaVersion | Number | Séma verzió (1 = legacy RSA, 2 = Double Ratchet) | Alapértelmezett: 2 |
| header.dh | String | Double Ratchet header: DH nyilvános kulcs | Opcionális |
| header.n | Number | Üzenet szám az aktuális láncban | Opcionális |
| header.pn | Number | Előző küldési lánc üzenetei | Opcionális |
| x3dhHeader.identityKey | String | X3DH bootstrap: identitás kulcs | Opcionális |
| x3dhHeader.ephemeralKey | String | X3DH bootstrap: ephemerális kulcs | Opcionális |
| x3dhHeader.spkKeyId | String | X3DH bootstrap: aláírt előzetes kulcs ID | Opcionális |
| x3dhHeader.opkKeyId | Mixed | X3DH bootstrap: egyszeri előzetes kulcs ID | Opcionális |
| x3dhHeader.recipientDeviceId | String | X3DH bootstrap: címzett eszköz | Opcionális |
| ciphertext | String | AES-256-GCM titkosított szöveg (base64) | Opcionális |
| iv | String | 96-bit GCM IV (base64) | Opcionális |
| status | String | Státusz (sent, delivered, read, replaced) | Alapértelmezett: 'sent' |
| messageType | String | Üzenet típus (text, file, image) | Alapértelmezett: 'text' |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |
| readAt | Date | Olvasási idő | Opcionális |
| encryptedContent | String | V1 legacy: titkosított tartalom | Opcionális |
| encryptionMetadata.* | Mixed | V1 legacy: titkosítási metaadatok | Opcionális |

Üzleti szabályok: E2EE chat üzenetek. Double Ratchet protokoll használata v2-ben. Indexek: sender/recipient/createdAt, recipient/status, recipientDeviceId/status.

#### PreKey (Előzetes kulcsok)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Felhasználó | Kötelező, index |
| deviceId | String | Eszköz azonosító | Kötelező |
| keyId | Number | Kulcs ID (monoton növekvő per user+device) | Kötelező |
| publicKey | String | ECDH P-256 SPKI nyilvános kulcs (base64) | Kötelező |
| used | Boolean | Használva | Alapértelmezett: false |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Egyszeri előzetes kulcsok (OPKs) eszközönként. Magas churn: OPKs azonnal törlődnek használat után. Indexek: userId/deviceId/used, userId/keyId (egyedi).

#### StorageBlob (Tárolási blob)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Felhasználó | Kötelező, index |
| blobType | String | Blob típus (message_log, session_state, skipped_keys) | Kötelező, enum |
| partitionKey | String | Partíció kulcs (pl. conversationId vagy deviceId) | Kötelező |
| encryptedPayload | String | AES-256-GCM titkosított payload (base64) | Kötelező |
| iv | String | 96-bit GCM IV (base64) | Kötelező |
| version | Number | Verzió | Alapértelmezett: 1 |
| updatedAt | Date | Frissítési idő | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Szerver-oldali titkosított üzenet/session történetek. A szerver vak a tartalomra. Indexek: userId/blobType/partitionKey (egyedi), userId/updatedAt.

## Fizikai és logikai szerkezet

- **Táblák/Nézetek**: MongoDB kollekciók (collections) a fenti sémák alapján.
- **Indexek**: alapértelmezett indexek az _id-re és egyedi mezőkre (pl. username, email).
- **Tárolt eljárások/Függvények**: Nincs (JavaScript backend kezel mindent).
- **Gyorsítótárazás (Cache)**: Redis in-memory adatbázis használata a teljesítmény növelésére, különösen a dashboard adatok gyors eléréséhez (pl. felhasználók listája, statisztikák), 5 perces lejárattal.

## Használati esetek (Use Cases) és forgatókönyvek

- **Felhasználói regisztráció és autentikáció**: Diákok/szülők regisztrálnak, bejelentkeznek; adatok User kollekcióban.
- **Menü kezelése**: Admin hozzáadja/szerkeszti MenuItems-t; diákok böngészik DailyMenu alapján.
- **Rendelés leadása**: Diák kiválaszt tételeket OrderItems-ben, Order létrejön; Payment rögzíti kifizetést.
- **Értékelés**: Felhasználók Review-t adnak MenuItems-hez (beágyazott).
- **Hűségprogram**: Vásárlások után UserLoyalty frissül.
- **Biztonság**: Minden akció SecurityLogs-ban naplózódik.
- **Admin műveletek**: Felhasználók listázása, statisztikák (User, Order stb. alapján), Redis cache-ből gyorsítottan.
- **E2EE Chat**: Üzenetek Message kollekcióban, PreKey-ek X3DH-hez, StorageBlob-ok titkosított történetekhez.
- **Eszköz szinkronizálás**: DeviceSyncSession ephemerális kulcs szinkronizáláshoz.

## Biztonság és hozzáférés

- **Felhasználói szerepek**: Admin (teljes hozzáférés), Student/Parent/Teacher (korlátozott), Frozen (blokkolva), Editor (szerkesztési jogok).
- **Jogosultságok**: JWT tokenek, middleware-ek (pl. requireAdmin).
- **Adatvédelmi szabályok**: E-mail ellenőrzés, GDPR-kompatibilis (pl. személyes adatok védelme), IP cím GDPR kompatibilis tárolás, E2EE chat üzenetek (szerver vak a tartalomra).
- **Biztonság**: Jelszavak hash-elve (bcrypt), reCAPTCHA, IP naplózás, IP hashelés, VPN/Tor detektálás, Double Ratchet E2EE protokoll üzenetekhez.

## Karbantartás és üzemeltetés

- **Biztonsági mentési eljárások**: MongoDB dump/export rendszeres mentéshez; Redis esetében adatok ideiglenesek, így külön mentés nem szükséges. DeviceSyncSession TTL miatt nem szükséges menteni.
- **Teljesítményfigyelés**: Lekérdezések optimalizálása, Redis cache használata dashboard-on a gyorsabb válaszidők érdekében. Message és PreKey magas churn figyelése.
- **Frissítési folyamatok**: Séma változásoknál migrációs szkriptek; verziókezelés Git-en keresztül. Redis konfiguráció környezeti változók alapján. E2EE v1-ről v2-re migráció támogatása Message-ben.
- **További**: Tesztelés (database_testing.js), kapcsolatkezelés környezeti változók alapján.

![Database Diagram](database.png)