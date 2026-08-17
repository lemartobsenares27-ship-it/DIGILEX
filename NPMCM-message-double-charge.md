# Message kay NPMCM — mali ang basehan ng Cost of Goods sa Jul 27 – Aug 9 SOA

**Net claim: ₱3,392.50** (isang hiling na lang, hindi tatlo)

---

## ITO ANG I-SEND MO

Hi [Name], salamat po sa SOA ng Aug 10–13. Tama po ang lahat dito — kumpleto po ang period at tugma po ang computation.

Pero may napansin po ako sa **SOA ninyo ng Jul 27 – Aug 9** (yung reissued), at dito po nanggagaling ang problema.

Sa lahat po ng SOA na napadala ninyo, ang **Cost of Goods po ay base sa parcels na NA-DELIVER** — kasing dami po ng COD Summary. Halimbawa po:

| SOA | COD Summary | Product Summary |
|---|---|---|
| Digilex2731.xlsx | 66 | **66** ✓ |
| July27Aug9Digilex.xlsx (una) | 114 | **114** ✓ |
| DigilexAug1013.xlsx | 74 | **74** ✓ |
| **Digilex27Aug9Revised.xlsx** | **211** | **259** ✗ |

Sa reissued po na Jul 27 – Aug 9, **259 po ang Product Summary** — kasing dami po ng Shipping Summary, hindi po ng COD. Ibig sabihin po, siningil po ang Cost of Goods base sa **ni-dispatch**, hindi po sa **na-deliver**.

Kaya po:

- **83 parcels** po ang nasingilan ng Cost of Goods kahit **hindi pa po na-deliver** — **₱5,980.00**
- Pero **35 parcels** naman po na na-deliver ay **hindi po nasingilan** — **₱2,587.50** (pabor po sa inyo ito, kasama ko na po sa computation)

**Net sobra po: ₱3,392.50**

Lumalabas na po ito ngayon: sa 83 na yun, **29 po ang na-deliver na** at nasingilan po **ulit** sa SOA ng Aug 10–13 — parehong tracking number, parehong halaga. Halimbawa po, **JT0022224416022** (Remie De Dios): ₱172.50 po sa Jul 27 – Aug 9, tapos ₱172.50 po ulit sa Aug 10–13.

Ang shipping fee po at parcel count po ay tama naman — isang beses lang po. Cost of Goods lang po po ang naapektuhan.

Naka-attach po ang listahan ng 29 na nadoble na, para po ma-verify ninyo agad.

Kung maayos po natin ang basehan sa Jul 27 – Aug 9 (Cost of Goods sa 211 na na-deliver, hindi po sa 259 na ni-dispatch), maaayos po lahat nang sabay — pati po yung 14 parcels na in-transit pa na madodoble rin po pagka-deliver, at yung 40 na RTS po na nakabalik na sa warehouse ninyo pero nasingilan pa rin ng Cost of Goods.

Salamat po sa pag-aasikaso!

---

## ENGLISH VERSION (kung email)

Hi [Name],

Thank you for the SOA covering August 10–13. That one is correct — complete period and the computation reconciles.

The issue is in your **reissued July 27 – August 9 SOA**.

In every statement you have sent, Cost of Goods is based on the parcels **delivered** — the Product Summary has the same number of rows as the COD Summary:

| SOA | COD Summary | Product Summary |
|---|---|---|
| Digilex2731.xlsx | 66 | **66** ✓ |
| July27Aug9Digilex.xlsx (original) | 114 | **114** ✓ |
| DigilexAug1013.xlsx | 74 | **74** ✓ |
| **Digilex27Aug9Revised.xlsx** | **211** | **259** ✗ |

In the reissued file the Product Summary has 259 rows — matching the Shipping Summary, not the COD Summary. Cost of Goods was charged on parcels **dispatched** rather than **delivered**.

The result:

- **83 parcels** were charged Cost of Goods without having been delivered — **₱5,980.00**
- **35 parcels** that were delivered were **not** charged — **₱2,587.50** (in your favour, and included in the figure below)

**Net overcharge: ₱3,392.50**

This is now surfacing: 29 of those 83 have since been delivered and charged Cost of Goods **again** in the August 10–13 SOA — same tracking numbers, identical amounts. For example **JT0022224416022** (Remie De Dios): ₱172.50 in July 27 – August 9, then ₱172.50 again in August 10–13.

The shipping fees and parcel counts are correct and were charged once only. Only Cost of Goods is affected.

The list of the 29 already double-charged is attached for your verification.

Correcting the basis in the July 27 – August 9 SOA — Cost of Goods on the 211 delivered rather than the 259 dispatched — resolves all of it at once, including the 14 parcels still in transit that would otherwise be double-charged on delivery, and the 40 RTS parcels charged Cost of Goods for stock already returned to your warehouse.

Thank you for looking into this.

[Your name]
Digilex

---

## PARA SA'YO LANG

### Bakit mas maganda itong bagong bersyon

Yung dati kong draft, hiwalay-hiwalay: ₱2,300 muna, tapos ₱862.50, tapos ₱2,817.50. Tatlong usapan, at kailangan mong ipaliwanag kung bakit nagkaiba ang sistema.

Itong bago: **ang patakaran nila mismo ang gamit mo.** Sa tatlong SOA nila, `Product = COD`. Sa isang file lang nagkaiba. Hindi mo na kailangang ipaliwanag — ipapakita mo lang yung apat na numero at siya na ang makakakita.

At **isang hiling na lang** — ayusin ang basehan sa isang file, kasama na lahat: yung 29 na nadoble, yung 14 na madodoble pa, at yung 40 RTS.

### Bakit ₱3,392.50 at hindi ₱5,980

Kasama sa computation yung **₱2,587.50 na pabor sa kanila** — 35 parcels na na-deliver pero hindi nasingilan sa reissue.

Sinabi ko ito nang tapat kasi: kapag ininspeksyon niya at nakita niyang may ₱2,587.50 na hindi mo binanggit, mawawalan ng bigat yung buong claim mo. Kapag ikaw mismo ang nagsabi, mas malakas ka — malinaw na tama ang tingin mo sa numero, hindi lang naghahanap ng mabawi.

### Kung sabihin niyang "tama naman po yung Aug 10–13"

Sang-ayon ka. **Tama nga yun.** Ang mali ay yung Jul 27 – Aug 9 reissue. Doon mo ituro, hindi sa bago.

### Attach

`NPMCM-double-charged-COGS-29-parcels.csv` — yung 29 na nadoble na, may tracking number, halaga sa parehong SOA, at yung shipping fee column na nagpapakita na isang beses lang naman yun nasingil.
