from enum import Enum


class Kotar(Enum):
    CENTAR = 1
    VAROS = 2
    MEJE = 3
    SPINUT = 4
    LOVRET = 5
    VISOKA = 6
    SUCIDAR = 7
    SKALICE = 8
    MEJASI = 9
    STOBREC = 10
    SOLIN = 11
    KASTELA = 12
    PODSTRANA = 13
    NEPOZNATO = 99

    @staticmethod
    def ispisi():
        print("=== KOTARI ===")
        for kotar in Kotar:
            print(f"{kotar.value} - {kotar.name}")