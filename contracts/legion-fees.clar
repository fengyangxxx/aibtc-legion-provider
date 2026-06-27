;; legion-fees
;; Routes provider payments, skimming 8% into this Legion's treasury.

(use-trait sip010-trait 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.faktory-trait-v1.sip-010-trait)

(define-constant ERR_DUST (err u430))
(define-constant ERR_SELF_ROUTE (err u431))

(define-constant TREASURY .legion-treasury)
(define-constant FEE_BPS u800)

(define-read-only (get-fee-bps)
  FEE_BPS
)

(define-read-only (quote-fee (amount uint))
  (/ (* amount FEE_BPS) u10000)
)

(define-public (route
    (ft <sip010-trait>)
    (amount uint)
    (to principal)
  )
  (let ((fee (/ (* amount FEE_BPS) u10000)))
    (asserts! (> fee u0) ERR_DUST)
    (asserts! (not (is-eq to TREASURY)) ERR_SELF_ROUTE)
    (try! (contract-call? .legion-treasury deposit ft fee))
    (try! (contract-call? ft transfer (- amount fee) tx-sender to none))
    (print { event: "route", payer: tx-sender, amount: amount, fee: fee, to: to })
    (ok fee)
  )
)
