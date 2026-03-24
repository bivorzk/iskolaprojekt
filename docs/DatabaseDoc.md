# Adatbázis Dokumentáció

## Az adatbázis célja, funkciója és a benne tárolt információk összefoglalása

Ez az adatbázis egy iskolai büfék rendszer (MERN stack projekt) részét képezi, amely lehetővé teszi a felhasználók (diákok, szülők, tanárok) számára az étkezés megrendelését, kifizetését és értékelését. A rendszer támogatja a felhasználói autentikációt, a menükezelést, rendeléseket, kifizetéseket, hűségprogramokat, E2EE chatet és biztonsági naplózást. A fő cél az iskolai étkezés hatékony és biztonságos kezelése, beleértve a készletkezelést, értékeléseket és a pénzügyi tranzakciókat. Az adatbázis MongoDB-t használ Mongoose ODM-mel, amely egy NoSQL adatbázis, de sémákkal strukturált. Redis-t használ gyorsítótárazáshoz és ideiglenes adatokhoz.

Az adatbázis-modell típusa: NoSQL (MongoDB), lekérdezési nyelv: JavaScript (Mongoose queries). Redis in-memory adatbázis gyorsítótárazáshoz és session/ephemerális adatokhoz.

## Adatbázis-terv és séma

### Entitások és kapcsolatok (ER modell összefoglaló)

A rendszer fő entitásai és kapcsolataik:

- **User** (Felhasználó): Központi entitás, minden más entitáshoz kapcsolódik.
- **UserPersonalInfo**: Egy felhasználóhoz tartozó személyes adatok (alágyazott dokumentum).
- **MenuItems** (Menüelemek): Étkezési tételek.
- **Order** (Rendelés): Felhasználók rendelései.
- **OrderItems** (Rendelés tételek): Egy rendeléshez tartozó menüelemek (Order-be ágyazva).
- **Payment** (Kifizetés): Pénzügyi tranzakciók.
- **Review** (Értékelés): Menüelemek értékelése (beágyazott MenuItems-ben).
- **DailyMenu** (Napi menü): Iskolai periódusok szerinti menük, több MenuItems-t tartalmaz (N:N kapcsolat linking table-lel).
- **ParentStudent** (Szülő-Diák kapcsolat): Szülők és diákok összekapcsolása.
- **SecurityLogs** (Biztonsági naplók): Események naplózása.
- **UserLoyalty** (Hűségprogram): Felhasználók pontjai, kedvezményei és hűségszintje.
- **DeviceSyncSession** (Eszköz szinkronizálási munkamenet): Eszközök közötti kulcs szinkronizálás (önálló, nem kapcsolódik más entitáshoz).
- **Message** (Üzenetek): E2EE chat üzenetek.
- **PreKey** (Előzetes kulcsok): ECDH előzetes kulcsok.
- **StorageBlob** (Tárolási blob): Titkosított üzenet/session történetek.

#### Kapcsolatok:
- User 1:N Payment, Order, SecurityLogs, UserLoyalty, Message (sender/recipient), PreKey, StorageBlob, ParentStudent (szülőként vagy diákként).
- MenuItems 1:N OrderItems (Order-be ágyazva), Review (beágyazott).
- Order 1:N OrderItems (beágyazott).
- DailyMenu N:M MenuItems (linking table: DailyMenuMenuItems).
- Message 1:1 PreKey (opcionális, X3DH-hez).
- StorageBlob 1:1 User (per blobType és partitionKey).
- DeviceSyncSession: önálló, nem kapcsolódik más entitáshoz.

#### Relációs séma (táblázatok részletei)

A részletes mezőleírásokat lásd lentebb minden entitásnál. A DailyMenu és MenuItems között N:M kapcsolat van, ezt a dbdiagram és relációs szemlélet miatt linking table-lel (DailyMenuMenuItems) is lehet ábrázolni.

#### Példa: DailyMenu és MenuItems kapcsolata (dbdiagram.io stílusban)

```dbml
Table DailyMenu {
  _id objectid [pk]
  date date
  schoolPeriod varchar
  createdAt datetime
}

Table MenuItems {
  _id objectid [pk]
  name varchar
  // ...további mezők
}

Table DailyMenuMenuItems {
  dailyMenuId objectid [ref: > DailyMenu._id]
  menuItemId objectid [ref: > MenuItems._id]
  // Composite PK: [dailyMenuId, menuItemId]
}
```

#### DeviceSyncSession
Ez a tábla önálló, nem kapcsolódik más entitáshoz, csak eszköz-azonosítókat és titkosított adatokat tárol. Ez teljesen rendben van, mivel ephemerális, session típusú adatokat kezel.

---

## Entitások részletes leírása

(Az alábbiakban minden entitás mezőit, típusát, jelentését, megszorításait, indexeit, és üzleti szabályait részletezem. Lásd az eredeti dokumentáció folytatását.)

### User (Felhasználók)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| username | String | Felhasználónév | Kötelező, egyedi | _id, username |
| password | String | Jelszó (hash-elt) | Kötelező | _id, password |
| email | String | E-mail cím | Kötelező, egyedi, e-mail formátum, trim | _id, email |
| isVerified | Boolean | E-mail ellenőrzés státusza | Alapértelmezett: false | _id, isVerified |
| usertype | String | Felhasználó típusa (admin, student, parent, teacher, frozen, editor) | Enum: ['admin', 'student', 'parent', 'teacher', 'frozen', 'editor'], alapértelmezett: 'student' | _id, usertype |
| createdAt | Date | Fiók létrehozási dátuma | Alapértelmezett: jelenlegi idő | _id, createdAt |
| balance | Number | Felhasználó egyenlege alkalmazáson belüli vásárlásokhoz | Alapértelmezett: 0 | _id, balance |
| isBanned | Boolean | Tiltott felhasználó | Alapértelmezett: false | _id, isBanned |
| banReason | String | Tiltás oka | Opcionális | _id, banReason |
| userPersonalInfo | [Subdocument] | Személyes információk (név, születési dátum, osztály, iskola, cím) | Opcionális | _id, userPersonalInfo |
| identity.publicKey | String | E2EE identitás nyilvános kulcs (ECDH P-256 SPKI base64) | Opcionális | _id, identity.publicKey |
| identity.signingPublicKey | String | E2EE aláíró nyilvános kulcs (ECDSA P-256) | Opcionális | _id, identity.signingPublicKey |
| identity.keyId | String | Kulcs azonosító (SHA-256 fingerprint) | Opcionális | _id, identity.keyId |
| identity.registeredAt | Date | E2EE regisztráció ideje | Opcionális | _id, identity.registeredAt |
| identity.isE2EEEnabled | Boolean | E2EE engedélyezve | Alapértelmezett: false | _id, identity.isE2EEEnabled |
| devices | [Array] | Regisztrált eszközök (deviceId, publicKey, label, stb.) | Opcionális | _id, devices |
| recoveryBlob.encryptedData | String | Helyreállítási blob (AES-GCM titkosított) | Opcionális | _id, recoveryBlob.encryptedData |
| recoveryBlob.iv | String | IV a helyreállítási blob-hoz | Opcionális | _id, recoveryBlob.iv |
| recoveryBlob.salt | String | Salt a helyreállítási blob-hoz | Opcionális | _id, recoveryBlob.salt |
| recoveryBlob.storedAt | Date | Helyreállítási blob tárolási ideje | Opcionális | _id, recoveryBlob.storedAt |
| encryption.* | Mixed | V1 legacy E2EE mezők (migrációhoz) | Opcionális | _id, encryption.* |

Üzleti szabályok: Minden felhasználónak egyedi felhasználóneve és e-mail címe van. A felhasználók típusa befolyásolja a hozzáférési jogokat (pl. admin mindenhez hozzáfér).

### Payment (Kifizetések)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Fizető felhasználó | Opcionális | _id, userId |
| amount | Number | Fizetett összeg | Kötelező | _id, amount |
| currency | String | Pénznem (pl. USD, HUF) | Kötelező | _id, currency |
| paymentMethod | String | Fizetési mód | Kötelező | _id, paymentMethod |
| status | String | Státusz (Completed, Pending, Failed) | Kötelező, enum: ['Completed', 'Pending', 'Failed'] | _id, status |
| transactionId | String | Külső tranzakció referencia | Opcionális | _id, transactionId |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő | _id, createdAt |

Üzleti szabályok: Minden kifizetés egy felhasználóhoz tartozik, de opcionális lehet (pl. vendég kifizetések).

### MenuItems (Menüelemek)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| name | String | Menüelem neve | Kötelező | _id, name |
| description | String | Leírás | Kötelező | _id, description |
| stock | Number | Készlet mennyisége | Kötelező, alapértelmezett: 0 | _id, stock |
| price | Number | Ár | Kötelező | _id, price |
| category | String | Kategória (Soup, Salad, stb.) | Kötelező, enum: ['Soup', 'Salad', 'MainDish', 'SideDish', 'Snack', 'Dessert', 'Drink', 'Healthy', 'SpecialDiet', 'DailySpecial', 'Other'], alapértelmezett: 'Other' | _id, category |
| available | Boolean | Elérhetőség | Alapértelmezett: true | _id, available |
| QRCode | String | QR kód a menüelemhez | Opcionális | _id, QRCode |
| allergens | [String] | Allergének listája | Alapértelmezett: [] | _id, allergens |
| nutritionalInfo.calories | Number | Kalóriák | Opcionális | _id, nutritionalInfo.calories |
| nutritionalInfo.protein | Number | Fehérje | Opcionális | _id, nutritionalInfo.protein |
| nutritionalInfo.carbs | Number | Szénhidrát | Opcionális | _id, nutritionalInfo.carbs |
| nutritionalInfo.fat | Number | Zsír | Opcionális | _id, nutritionalInfo.fat |

Üzleti szabályok: A készlet nem lehet negatív; kategóriák alapján szűrhető. Pre-save hook: Ha a készlet <= 0, akkor available = false, különben true.

### Order (Rendelések)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Rendelő felhasználó | Kötelező | _id, userId |
| items | [OrderItemsScheme] | Rendelés tételei | Kötelező | _id, items |
| orderDate | Date | Rendelés dátuma | Alapértelmezett: jelenlegi idő | _id, orderDate |
| status | String | Státusz (Pending, InProgress, Completed, Cancelled) | Kötelező, enum: ['Pending', 'InProgress', 'Completed', 'Cancelled'], alapértelmezett: 'Pending' | _id, status |
| totalAmount | Number | Teljes összeg | Kötelező | _id, totalAmount |
| pickupTime | Date | Átvétel ideje | Opcionális | _id, pickupTime |
| notes | String | Megjegyzések | Opcionális, alapértelmezett: '' | _id, notes |
| paypalOrderId | String | PayPal rendelés azonosító | Opcionális | _id, paypalOrderId |
| paymentMethod | String | Fizetési mód | Opcionális | _id, paymentMethod |
| transactionId | String | Tranzakció azonosító | Opcionális | _id, transactionId |
| publicID | String | Nyilvános azonosító | Kötelező, egyedi | _id, publicID |

Üzleti szabályok: Minden rendelés egy felhasználóhoz tartozik; státusz változások követik az üzleti folyamatot. Pre-save hook: Ha a rendelés 'Pending' státuszban van és több mint 15 perc telt el a létrehozás óta, automatikusan 'Cancelled'-re változik.

### OrderItems (Rendelés tételek)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| menuItemId | ObjectId (ref: MenuItems) | Menüelem azonosító | Kötelező | _id, menuItemId |
| orderId | ObjectId (ref: Order) | Rendelés azonosító | Opcionális | _id, orderId |
| quantity | Number | Mennyiség | Kötelező, alapértelmezett: 1 | _id, quantity |

Üzleti szabályok: Minden tétel egy menüelemhez tartozik; mennyiség pozitív egész szám. Ez a séma be van ágyazva az Order séma items mezőjébe.

### Review (Értékelések) - Beágyazott MenuItems-ben

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Értékelő felhasználó | Opcionális | _id, userId |
| rating | Number | Értékelés (1-5) | Kötelező, min: 1, max: 5 | _id, rating |
| comment | String | Megjegyzés | Kötelező, maxlength: 500 | _id, comment |
| date | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő | _id, date |
| ipAddress | String | IP cím | Opcionális | _id, ipAddress |
| reported | Boolean | Jelentve | Alapértelmezett: false | _id, reported |
| moderated | Boolean | Moderálva | Alapértelmezett: false | _id, moderated |
| moderatorNotes | String | Moderátor jegyzetek | Opcionális | _id, moderatorNotes |

Üzleti szabályok: Értékelések be vannak ágyazva a MenuItems kollekcióba. Egy felhasználó többször is értékelhet különböző tételeket.

### DailyMenu (Napi menü)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| date | Date | Dátum | Kötelező | _id, date |
| schoolPeriod | String | Iskolai periódus (morning, afternoon) | Kötelező, enum: ['morning', 'afternoon'] | _id, schoolPeriod |
| menuItems | [ObjectId] (ref: MenuItems) | Menüelemek listája | Kötelező | _id, menuItems |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő | _id, createdAt |

Üzleti szabályok: Napi menük periódusonként készülnek.

### ParentStudent (Szülő-Diák kapcsolat)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| parentId | ObjectId (ref: User) | Szülő felhasználó | Kötelező | _id, parentId |
| studentId | ObjectId (ref: User) | Diák felhasználó | Kötelező | _id, studentId |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő | _id, createdAt |

Üzleti szabályok: Szülők több diákhoz is kapcsolódhatnak.

### SecurityLogs (Biztonsági naplók)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Felhasználó | Opcionális | _id, userId |
| action | String | Akció (pl. LOGIN_SUCCESS) | Kötelező | _id, action |
| type | String | Típus (INFO, WARNING, ERROR) | Kötelező | _id, type |
| ipAddress | String | IP cím (Hashelt) | Opcionális | _id, ipAddress |
| Timestamp | Date | Időbélyeg | Alapértelmezett: jelenlegi idő | _id, Timestamp |
| details | String | További információk | Opcionális | _id, details |
| country | String | Ország | Opcionális | _id, country |
| CountryCode | String | Országkód | Opcionális | _id, CountryCode |
| currency | String | Pénznem | Opcionális | _id, currency |
| Continent | String | Kontinens | Opcionális | _id, Continent |
| IsVPN | Boolean | VPN használat | Opcionális | _id, isVPN |
| isTor | Boolean | Tor használat | Opcionális | _id, isTor |
| isProxy | Boolean | Proxy használat | Opcionális | _id, isProxy |

Üzleti szabályok: Naplók minden fontos eseményt rögzítenek.

### UserLoyalty (Hűségprogram)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Felhasználó | Kötelező | _id, userId |
| totalPoints | Number | Összes pont | Alapértelmezett: 0 | _id, totalPoints |
| userTier | String | Felhasználó hűségszintje | Enum: ['none', 'Bronze', 'Silver', 'Gold', 'Platinum'], alapértelmezett: 'none' | _id, userTier |
| discounts | String | Kedvezmények listája | [Lásd tábla alatt]: | _id, discounts |
| lastUpdated | Date | Utolsó frissítés | Alapértelmezett: jelenlegi idő | _id, lastUpdated |

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

---

## 8. Codebase Mapping (Dokumentáció kiterjesztése)

Ez a szakasz jól kiegészíti a fenti adatbázis-séma leírást azzal, hogy direkt hivatkozásokat ad a megvalósító kódra és a rendszer működési helyszíneire.

### 8.1 Fő MongoDB modellek és elérési helyük

- `src/models/User.js`: `User` és al-sémák (`userPersonalInfo`, `identity`, `devices`, `recoveryBlob`, `encryption`).
- `config/database_queries.js`: `Payment`, `MenuItems`, `Order`, `OrderItems`, `DailyMenu`, `ParentStudent`, `SecurityLogs`, `UserLoyalty`, `Reward`, `Redemption`, `MoneyRequest` és a rendszeres indexek + pre-save hook-ok.
- `src/models/DeviceSyncSession.js`: `DeviceSyncSession`, TTL index `expiresAt`.
- `src/models/Message.js`: `Message` (E2EE metaadatok, state-tracking, indexek, markAsRead helper).
- `src/models/PreKey.js`: `PreKey` (X3DH kulcsok, `userId`/`deviceId` indexek és `keyId` egyediség).
- `src/models/StorageBlob.js`: `StorageBlob` (mentett titkosított session-adatok, `userId/blobType/partitionKey` egyedi index).

### 8.2 Adat-műveletek és szolgáltatás réteg

- `src/api.js`: központi REST végpontok, ahol az Order és Payment folyamat, valamint email kontrollálás történik.
  -  `/api/orders` CRUD + PayPal/Google Pay + balance payment + `save-order` faladat.
  -  `orderService` és `paypalService`, `googlePayService` importálása, `validateOrderInput` + `validatePaymentInput` közteselt.
- `src/Orders/Order.js` és `src/LoyaltySystem/*`: eszközök a rendelés feldolgozásához, `UserLoyalty` frissítéshez, hűségpont-számításhoz.
- `src/auth/*.js`: user auth események (`register.js`, `login.js`, `2fa.js`, `password_reset.js`, `email_verification.js`), `SecurityLogs` használat,
  - Bejelentkezéskor `SecurityLogs` rögzítése és `User.lastActive` update.
- `src/services/*`: logika a transzparens adatbázis-frissítéshez, pontos számításokhoz (rate, coupon, rewards).

### 8.3 Adatbázis integráció és lépések a rendszerindításkor

1. `.env` változók betöltése (pl. `MONGODB_URI`, `DB_NAME`) a `require('dotenv').config()` eltérő helyeken (`src/models/User.js`, `config/database_queries.js`).
2. `mongoose.connect` kezdeti kötés a két fő komponensben (User auth és db query wrapper).
3. `module.exports` a modellekre, amik más modulokban importálva vannak (`src/api.js`, `src/auth/login.js`, `src/dashboard/...`).
4. Redis-hez kapcsolódás a `src/redis.js` és `src/cache/*` réteghez (rate limit, cache, Chage Stream Manager, key registry).

### 8.4 Kulcsfontosságú funkciók és adatfolyamok a fő modulokban

- **Rendelésfeladás**: `src/api.js` -> `orderService.validateOrderStock` -> `orderService.convertCartToDbFormat` -> `Order.create/Order.save` => `UserLoyalty.updatePointsAtomically` (mentes) -> `SecurityLogs` környezet.
- **Címzett- és szülő-diák kapcsolatok**: `ParentStudent` sémán át, admin/hozzáférés a `src/dashboard/*` és `src/models/User.js` szerinti `userPersonalInfo` kapcsolattal.
- **E2EE üzenetek**: `src/models/Message.js` és `src/models/PreKey.js` + `src/models/StorageBlob.js` + `src/LoyaltySystem` (további konzisztencia, audit) + `src/chat/**` frontend.

### 8.5 Biztonsági és fenntarthatósági megjegyzések

- Jelszavak: `bcrypt` a `src/auth/passwordhash.js` foglalja össze (hash + compare).
- Naplózás: minden fontos művelet (`SecurityLogs`) a `src/auth/login.js`, `src/auth/register.js`, `src/api.js` végpontokban történik.
- Indexek a query-gyorsításhoz mapperálva a `config/database_queries.js`-ben teszi hatékonyá.
- TTL megoldás `DeviceSyncSession`-ben `expiresAt` mező és MongoDB `expireAfterSeconds`.

### 8.6 Gyakori karbantartási feladatok

- `dbconnected` állapot ellenőrzése: logok a startnál (`Connected to MongoDB ...`, `Could not connect ...`).
- `mongoose.set('debug', true)` ideiglenesen `config/database_queries.js`-ben az adatelemzéshez.
- Üzleti szabályok tesztelése: `tests/database_testing.js`, `tests/performance_tests/*`, `tests/register_testing.py`.
- Adat tisztán tartása: `SecurityLogs`, `StorageBlob`, `DeviceSyncSession` TTL/archiválás.

---

```

### DeviceSyncSession (Eszköz szinkronizálási munkamenet)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| responderDeviceId | String | Az eszköz, amely várja a szinkronizálási payload-ot | Kötelező, index | _id, responderDeviceId |
| initiatorDeviceId | String | Az eszköz, amely feltöltötte a szinkronizálási payload-ot | Opcionális | _id, initiatorDeviceId |
| encryptedPayload | String | Titkosított szinkronizálási payload (ECDH + AES-GCM) | Kötelező | _id, encryptedPayload |
| iv | String | IV az AES-GCM titkosításhoz | Kötelező | _id, iv |
| ephemeralKey | String | Ephemerális ECDH nyilvános kulcs | Kötelező | _id, ephemeralKey |
| expiresAt | Date | Lejárati idő (10 perc) | Alapértelmezett: jelenlegi idő + 10 perc | _id, expiresAt |

Üzleti szabályok: Ephemerális tábla eszközök közötti kulcs szinkronizáláshoz. TTL index automatikusan törli a dokumentumokat 10 perc után.

### Message (Üzenetek)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| senderId | ObjectId (ref: User) | Küldő felhasználó | Kötelező | _id, senderId |
| recipientId | ObjectId (ref: User) | Címzett felhasználó | Kötelező | _id, recipientId |
| senderDeviceId | String | Küldő eszköz azonosító | Opcionális | _id, senderDeviceId |
| recipientDeviceId | String | Címzett eszköz azonosító | Opcionális | _id, recipientDeviceId |
| schemaVersion | Number | Séma verzió (1 = legacy RSA, 2 = Double Ratchet) | Alapértelmezett: 2 | _id, schemaVersion |
| header.dh | String | Double Ratchet header: DH nyilvános kulcs | Opcionális | _id, header.dh |
| header.n | Number | Üzenet szám az aktuális láncban | Opcionális | _id, header.n |
| header.pn | Number | Előző küldési lánc üzenetei | Opcionális | _id, header.pn |
| x3dhHeader.identityKey | String | X3DH bootstrap: identitás kulcs | Opcionális | _id, x3dhHeader.identityKey |
| x3dhHeader.ephemeralKey | String | X3DH bootstrap: ephemerális kulcs | Opcionális | _id, x3dhHeader.ephemeralKey |
| x3dhHeader.spkKeyId | String | X3DH bootstrap: aláírt előzetes kulcs ID | Opcionális | _id, x3dhHeader.spkKeyId |
| x3dhHeader.opkKeyId | Mixed | X3DH bootstrap: egyszeri előzetes kulcs ID | Opcionális | _id, x3dhHeader.opkKeyId |
| x3dhHeader.recipientDeviceId | String | X3DH bootstrap: címzett eszköz | Opcionális | _id, x3dhHeader.recipientDeviceId |
| ciphertext | String | AES-256-GCM titkosított szöveg (base64) | Opcionális | _id, ciphertext |
| iv | String | 96-bit GCM IV (base64) | Opcionális | _id, iv |
| status | String | Státusz (sent, delivered, read, replaced) | Alapértelmezett: 'sent' | _id, status |
| messageType | String | Üzenet típus (text, file, image) | Alapértelmezett: 'text' | _id, messageType |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő | _id, createdAt |
| readAt | Date | Olvasási idő | Opcionális | _id, readAt |
| encryptedContent | String | V1 legacy: titkosított tartalom | Opcionális | _id, encryptedContent |
| encryptionMetadata.* | Mixed | V1 legacy: titkosítási metaadatok | Opcionális | _id, encryptionMetadata.* |

Üzleti szabályok: E2EE chat üzenetek. Double Ratchet protokoll használata v2-ben. Indexek: sender/recipient/createdAt, recipient/status, recipientDeviceId/status.

### PreKey (Előzetes kulcsok)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Felhasználó | Kötelező, index | _id, userId |
| deviceId | String | Eszköz azonosító | Kötelező | _id, deviceId |
| keyId | Number | Kulcs ID (monoton növekvő per user+device) | Kötelező | _id, keyId |
| publicKey | String | ECDH P-256 SPKI nyilvános kulcs (base64) | Kötelező | _id, publicKey |
| used | Boolean | Használva | Alapértelmezett: false | _id, used |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő | _id, createdAt |

Üzleti szabályok: Egyszeri előzetes kulcsok (OPKs) eszközönként. Magas churn: OPKs azonnal törlődnek használat után. Indexek: userId/deviceId/used, userId/keyId (egyedi).

### StorageBlob (Tárolási blob)

| Mező neve | Típus | Jelentés/Szerep | Megszorítások | Indexek |
|-----------|-------|-----------------|---------------|---------|
| userId | ObjectId (ref: User) | Felhasználó | Kötelező, index | _id, userId |
| blobType | String | Blob típus (message_log, session_state, skipped_keys) | Kötelező, enum | _id, blobType |
| partitionKey | String | Partíció kulcs (pl. conversationId vagy deviceId) | Kötelező | _id, partitionKey |
| encryptedPayload | String | AES-256-GCM titkosított payload (base64) | Kötelező | _id, encryptedPayload |
| iv | String | 96-bit GCM IV (base64) | Kötelező | _id, iv |
| version | Number | Verzió | Alapértelmezett: 1 | _id, version |
| updatedAt | Date | Frissítési idő | Alapértelmezett: jelenlegi idő | _id, updatedAt |

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
- **Eszköz szinkronizálás**: DeviceSyncSession ephemerális kulcs szinkronizálási munkamenetekkel.

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

## E2EE Chat és Üzenetkezelés az Adatbázisban

A rendszer egyik legösszetettebb és legnagyobb része a végpontok közötti titkosított (E2EE) chat funkció, amely több adatbázis-@entitást is érint. Az üzenetküldés a Double Ratchet protokollra és X3DH kulcscserére épül, így minden üzenet és kulcsmozgás külön dokumentumként jelenik meg a MongoDB-ben. A főbb komponensek:

- **Message**: Minden elküldött üzenet egy dokumentum, amely tartalmazza a küldő és címzett felhasználó és eszköz azonosítóját, a titkosított üzenettartalmat, státuszát, időbélyegeket, valamint a Double Ratchet és X3DH protokollhoz szükséges metaadatokat (header, x3dhHeader, encryptionMetadata stb.).
- **PreKey**: Az előzetes kulcsok (OPK, SPK) a kulcscsere protokollhoz, minden eszközre és felhasználóra külön dokumentumként tárolva. Ezek gyorsan cserélődnek, használat után törlődnek.
- **StorageBlob**: Titkosított üzenet- és session-történetek, amelyek lehetővé teszik a kliensoldali visszaállítást vagy szinkronizációt. A szerver nem lát bele a tartalomba (zero-knowledge).
- **DeviceSyncSession**: Ideiglenes, eszközök közötti kulcsszinkronizálási session-ök, amelyek automatikusan törlődnek (TTL index).

A chat rendszer minden komponense úgy van kialakítva, hogy a szerver ne férjen hozzá a titkosított tartalomhoz, csak a szükséges metaadatokat tárolja. Az üzenetek, kulcsok és session-ök közötti kapcsolatok referenciákon (ObjectId) és eszközazonosítókon alapulnak. A Message kollekció indexei optimalizálják a keresést felhasználó, eszköz és státusz szerint. A PreKey és StorageBlob kollekciók magas churn-t kezelnek, mivel a kulcsok és session-ök gyorsan cserélődnek. Ez a felépítés biztosítja a biztonságos, skálázható és auditálható chat-funkciót az iskolai rendszerben.