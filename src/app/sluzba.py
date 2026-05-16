from enum import Enum


class Sluzba(Enum):
    POLICIJA = (1, "Policija")
    VATROGASCI = (2, "Vatrogasci")
    CISTOCA = (3, "Čistoća")
    KOMUNALNO_REDARSTVO = (4, "Komunalno redarstvo")
    ZELENILO = (5, "Zelenilo")
    VODOVOD_KANALIZACIJA = (6, "Vodovod i kanalizacija")
    ODRZAVANJE_CESTA = (7, "Održavanje cesta")
    PROMET = (8, "Promet")
    JAVNI_PRIJEVOZ = (9, "Javni prijevoz")
    JAVNA_RASVJETA = (10, "Javna rasvjeta")
    GRADJEVINSKI_NADZOR = (11, "Građevinski nadzor")
    HITNA_MEDICINA = (12, "Hitna medicina")
    GRADSKA_UPRAVA = (13, "Gradska uprava")
    NEPOZNATO = (99, "Nepoznato")

    def __init__(self, broj, naziv):
        self.broj = broj
        self.naziv = naziv

    @staticmethod
    def ispisi():
        print("=== SLUŽBE ===")

        for sluzba in Sluzba:
            print(f"{sluzba.broj} - {sluzba.naziv}")