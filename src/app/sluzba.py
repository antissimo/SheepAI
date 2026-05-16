from enum import Enum

class Sluzba(Enum):
    POLICIJA = 1
    VATROGASCI = 2
    CISTOCA = 3
    KOMUNALNO_REDARSTVO = 4
    ZELENILO = 5
    VODOVOD_KANALIZACIJA = 6
    ODRZAVANJE_CESTA = 7
    PROMET = 8
    JAVNI_PRIJEVOZ = 9
    JAVNA_RASVJETA = 10
    GRADJEVINSKI_NADZOR = 11
    HITNA_MEDICINA = 12
    GRADSKA_UPRAVA = 13
    NEPOZNATO = 99

    @staticmethod
    def ispisi():
        print("=== SLUŽBE ===")
        for sluzba in Sluzba:
            print(f"{sluzba.value} - {sluzba.name}")