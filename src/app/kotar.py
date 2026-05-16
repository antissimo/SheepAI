from enum import Enum


class Kotar(Enum):
    CENTAR = (1, "Centar")
    VAROS = (2, "Varoš")
    MEJE = (3, "Meje")
    SPINUT = (4, "Spinut")
    LOVRET = (5, "Lovret")
    VISOKA = (6, "Visoka")
    SUCIDAR = (7, "Sućidar")
    SKALICE = (8, "Skalice")
    MEJASI = (9, "Mejaši")
    STOBREC = (10, "Stobreč")
    SOLIN = (11, "Solin")
    KASTELA = (12, "Kaštela")
    PODSTRANA = (13, "Podstrana")
    NEPOZNATO = (99, "Nepoznato")

    def __init__(self, broj, naziv):
        self.broj = broj
        self.naziv = naziv

    @staticmethod
    def ispisi():
        print("=== KOTARI ===")
        for kotar in Kotar:
            print(f"{kotar.broj} - {kotar.naziv}")