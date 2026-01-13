# Adatbázis Dokumentáció

## Az adatbázis célja, funkciója és a benne tárolt információk összefoglalása

Ez az adatbázis egy iskolai büfék rendszer (MERN stack projekt) részét képezi, amely lehetővé teszi a felhasználók (diákok, szülők, tanárok) számára az étkezés megrendelését, kifizetését és értékelését. A rendszer támogatja a felhasználói autentikációt, a menükezelést, rendeléseket, kifizetéseket, hűségprogramokat és biztonsági naplózást. A fő cél az iskolai étkezés hatékony és biztonságos kezelése, beleértve a készletkezelést, értékeléseket és a pénzügyi tranzakciókat. Az adatbázis MongoDB-t használ Mongoose ODM-mel, amely egy NoSQL adatbázis, de sémákkal strukturált.

Az adatbázis-modell típusa: NoSQL (MongoDB), lekérdezési nyelv: JavaScript (Mongoose queries).

## Adatbázis-terv és séma

### Entitások és kapcsolatok (ER modell összefoglaló)

A rendszer fő entitásai és kapcsolataik:

- **User** (Felhasználó): Központi entitás, minden más entitáshoz kapcsolódik.
- **MenuItems** (Menüelemek): Étkezési tételek.
- **Order** (Rendelés): Felhasználók rendelései.
- **OrderItems** (Rendelés tételek): Egy rendeléshez tartozó menüelemek.
- **Payment** (Kifizetés): Pénzügyi tranzakciók.
- **Review** (Értékelés): Menüelemek értékelése.
- **DailyMenu** (Napi menü): Iskolai periódusok szerinti menük.
- **ParentStudent** (Szülő-Diák kapcsolat): Szülők és diákok összekapcsolása.
- **SecurityLogs** (Biztonsági naplók): Események naplózása.
- **UserLoyalty** (Hűségprogram): Felhasználók pontjai és kedvezményei.

Kapcsolatok:
- User 1:N Payment, Order, Review, SecurityLogs, UserLoyalty.
- User 1:N ParentStudent (szülőként vagy diákként).
- MenuItems 1:N OrderItems, Review.
- Order 1:N OrderItems.
- DailyMenu 1:N MenuItems (referenciákon keresztül).

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
| usertype | String | Felhasználó típusa (admin, student, parent, teacher, frozen) | Enum: ['admin', 'student', 'parent', 'teacher', 'frozen'], alapértelmezett: 'student' |
| createdAt | Date | Fiók létrehozási dátuma | Alapértelmezett: jelenlegi idő |
| balance | Number | Felhasználó egyenlege alkalmazáson belüli vásárlásokhoz | Alapértelmezett: 0 |

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

Üzleti szabályok: A készlet nem lehet negatív; kategóriák alapján szűrhető.

#### Order (Rendelések)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Rendelő felhasználó | Kötelező |
| totalAmount | Number | Teljes összeg | Kötelező |
| status | String | Státusz (Pending, Confirmed, stb.) | Kötelező, enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Delivered', 'Cancelled'] |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |
| publicID | String | Nyilvános azonosító | Opcionális |

Üzleti szabályok: Minden rendelés egy felhasználóhoz tartozik; státusz változások követik az üzleti folyamatot.

#### OrderItems (Rendelés tételek)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| orderId | ObjectId (ref: Order) | Rendelés azonosító | Kötelező |
| menuItemId | ObjectId (ref: MenuItems) | Menüelem azonosító | Kötelező |
| quantity | Number | Mennyiség | Kötelező |
| priceAtPurchase | Number | Vásárláskori ár | Kötelező |
| specialInstructions | String | Speciális utasítások | Opcionális |

Üzleti szabályok: Minden tétel egy rendeléshez és menüelemhez tartozik; mennyiség pozitív egész szám.

#### Review (Értékelések)
| Mező neve | Típus | Jelentés/Szerep | Megszorítások |
|-----------|-------|-----------------|---------------|
| userId | ObjectId (ref: User) | Értékelő felhasználó | Kötelező |
| menuItemId | ObjectId (ref: MenuItems) | Értékelt menüelem | Kötelező |
| rating | Number | Értékelés (1-5) | Kötelező, min: 1, max: 5 |
| comment | String | Megjegyzés | Opcionális |
| createdAt | Date | Létrehozási idő | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Egy felhasználó többször is értékelhet különböző tételeket.

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
| ipAddress | String | IP cím | Opcionális |
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
| discounts | [{type: String, rate: Number, validUntil: Date}] | Kedvezmények listája | - |
| lastUpdated | Date | Utolsó frissítés | Alapértelmezett: jelenlegi idő |

Üzleti szabályok: Pontok vásárlások alapján gyűlnek.

## Fizikai és logikai szerkezet

- **Táblák/Nézetek**: MongoDB kollekciók (collections) a fenti sémák alapján.
- **Indexek**: Nincs explicit említés, de alapértelmezett indexek az _id-re és egyedi mezőkre (pl. username, email).
- **Tárolt eljárások/Függvények**: Nincs (JavaScript backend kezel mindent).

## Használati esetek (Use Cases) és forgatókönyvek

- **Felhasználói regisztráció és autentikáció**: Diákok/szülők regisztrálnak, bejelentkeznek; adatok User kollekcióban.
- **Menü kezelése**: Admin hozzáadja/szerkeszti MenuItems-t; diákok böngészik DailyMenu alapján.
- **Rendelés leadása**: Diák kiválaszt tételeket OrderItems-ben, Order létrejön; Payment rögzíti kifizetést.
- **Értékelés**: Felhasználók Review-t adnak MenuItems-hez.
- **Hűségprogram**: Vásárlások után UserLoyalty frissül.
- **Biztonság**: Minden akció SecurityLogs-ban naplózódik.
- **Admin műveletek**: Felhasználók listázása, statisztikák (User, Order stb. alapján).

## Biztonság és hozzáférés

- **Felhasználói szerepek**: Admin (teljes hozzáférés), Student/Parent/Teacher (korlátozott), Frozen (blokkolva).
- **Jogosultságok**: JWT tokenek, middleware-ek (pl. requireAdmin).
- **Adatvédelmi szabályok**: E-mail ellenőrzés, GDPR-kompatibilis (pl. személyes adatok védelme), IP cím GDPR kombatibilis tárolás.
- **Biztonság**: Jelszavak hash-elve (bcrypt), reCAPTCHA, IP naplózás, IP hashelés, VPN/Tor detektálás.

## Karbantartás és üzemeltetés

- **Biztonsági mentési eljárások**: MongoDB dump/export rendszeres mentéshez.
- **Teljesítményfigyelés**: Lekérdezések optimalizálása, Redis cache használata dashboard-on.
- **Frissítési folyamatok**: Séma változásoknál migrációs szkriptek; verziókezelés Git-en keresztül.
- **További**: Tesztelés (database_testing.js), kapcsolatkezelés környezeti változók alapján.
````