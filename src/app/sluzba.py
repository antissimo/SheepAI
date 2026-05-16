from enum import Enum

class Sluzba(str, Enum):
    POLICIJA = "policija"
    VATROGASCI = "vatrogasci"

    CISTOCA = "cistoca"
    KOMUNALNO_REDARSTVO = "komunalno_redarstvo"
    ZELENILO = "zelenilo" 
    VODOVOD = "vodovod_kanalizacija"
    CESTE = "odrzavanje_cesta"

    PROMET = "promet"
    JAVNI_PRIJEVOZ = "javni_prijevoz"

    JAVNA_RASVJETA = "javna_rasvjeta"
    GRADJEVINSKI_NADZOR = "gradjevinski_nadzor"

    HITNA_MEDICINA = "hitna_medicina"

    GRADSKA_UPRAVA = "gradska_uprava"

    NEPOZNATO = "nepoznato"