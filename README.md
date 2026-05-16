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
```

## Filter Agent (AutoGen + Ollama)

Instalacija:

```bash
pip install -r requirements.txt
```

Pokretanje Ollame:

```bash
ollama serve
ollama pull llama3.1:8b
```

Opcionalno za vision:

```bash
ollama pull llava
export OLLAMA_USE_VISION=true
export OLLAMA_VISION_MODEL=llava
```

Pokretanje backenda (postojeća komanda projekta):

```bash
uvicorn app.main:app --reload
```

Test endpoint:

```bash
curl -X POST http://localhost:8000/agent/filter \
  -F "text=Na Žnjanu je razbijena kanta za smeće i smeće je po cesti već tri dana" \
  -F "lat=43.503" \
  -F "lng=16.470" \
  -F "district_suggestion=Žnjan"
```
