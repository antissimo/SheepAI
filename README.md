# SheepAI

## LET'S MAKE SPLIT BETTER

Pametni AI ticketing sustav za prijavu problema u gradu Splitu.

---

# Problem

Građani svakodnevno vide probleme:
- smeće na ulici
- nepropisno parkiranje
- oštećene ceste
- požare
- prometne probleme
- komunalne probleme
- hitne situacije

Ali:
- ne znaju kome prijaviti
- prijava traje predugo
- nema transparentnosti
- isti problem se prijavljuje više puta
- službe nemaju centralizirani sustav

---

# Naše rješenje

## SheepAI

AI sustav koji:
- automatski klasificira problem
- određuje odgovornu službu
- procjenjuje hitnost
- detektira duplikate
- generira standardizirani ticket
- povezuje građane i gradske službe

Cilj:
> učiniti Split čišćim, sigurnijim i funkcionalnijim gradom.

---

# Službe koje podržavamo

- Policija
- Čistoća
- Vatrogasci
- Bolnica
- Komunalno redarstvo
- Promet Split

---

# Input

Korisnik može poslati:

## Tekst
Opis problema prirodnim jezikom.

Primjer:
> "Na Spinutu gori kontejner."

---

## Slike
Slikavanje problema:
- smeće
- prometna nesreća
- rupa na cesti
- požar
- vandalizam

---

## Geografska lokacija
Automatski:
- GPS lokacija korisnika
- prijedlog kotara

---

## Kotar
Automatski se predlaže iz lokacije:
- Split 3
- Spinut
- Žnjan
- Bačvice
- Meje
- itd.

---

# AI Pipeline

```text
CLIENT
   ↓
FILTER AGENT
(detekcija spama + ocjena vjerodostojnosti)
   ↓
STANDARDIZATION AGENT
(pretvara input u standardni format)
   ↓
CLASSIFICATION AGENT
(određuje službu i hitnost)
   ↓
JSON OUTPUT