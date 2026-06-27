;; legion-treasury
;; Holds pool-accounted sBTC for a provider Legion.

(use-trait sip010-trait 'STTWD9SPRQVD3P733V89SV0P8RZRZNQADG034F0A.faktory-trait-v1.sip-010-trait)

(define-constant DEPLOYER tx-sender)

(define-constant ERR_UNAUTHORIZED (err u401))
(define-constant ERR_INSUFFICIENT (err u402))
(define-constant ERR_ALREADY_WIRED (err u403))
(define-constant ERR_ZERO_AMOUNT (err u409))
(define-constant ERR_INVALID_PRINCIPAL (err u410))
(define-constant ERR_INVALID_RECIPIENT (err u411))
(define-constant ERR_WRONG_TOKEN (err u412))

(define-data-var Gov (optional principal) none)
(define-data-var Token (optional principal) none)
(define-data-var Balance uint u0)

(define-read-only (get-balance)
  (var-get Balance)
)

(define-read-only (get-gov)
  (var-get Gov)
)

(define-read-only (get-token)
  (var-get Token)
)

(define-private (is-authorized-mover (who principal))
  (is-eq (some who) (var-get Gov))
)

(define-public (set-gov (gov principal))
  (begin
    (asserts! (is-eq contract-caller DEPLOYER) ERR_UNAUTHORIZED)
    (asserts! (is-none (var-get Gov)) ERR_ALREADY_WIRED)
    (asserts! (not (is-eq gov (as-contract tx-sender))) ERR_INVALID_PRINCIPAL)
    (var-set Gov (some gov))
    (print { event: "set-gov", gov: gov })
    (ok true)
  )
)

(define-public (set-token (token principal))
  (begin
    (asserts! (is-eq contract-caller DEPLOYER) ERR_UNAUTHORIZED)
    (asserts! (is-none (var-get Token)) ERR_ALREADY_WIRED)
    (asserts! (not (is-eq token (as-contract tx-sender))) ERR_INVALID_PRINCIPAL)
    (var-set Token (some token))
    (print { event: "set-token", token: token })
    (ok true)
  )
)

(define-public (deposit
    (ft <sip010-trait>)
    (amount uint)
  )
  (begin
    (asserts! (is-eq (contract-of ft) (unwrap! (var-get Token) ERR_WRONG_TOKEN)) ERR_WRONG_TOKEN)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (try! (contract-call? ft transfer amount tx-sender (as-contract tx-sender) none))
    (var-set Balance (+ (var-get Balance) amount))
    (print { event: "deposit", from: tx-sender, amount: amount, balance: (var-get Balance) })
    (ok true)
  )
)

(define-public (execute-transfer
    (ft <sip010-trait>)
    (recipient principal)
    (amount uint)
  )
  (let ((bal (var-get Balance)))
    (asserts! (is-authorized-mover contract-caller) ERR_UNAUTHORIZED)
    (asserts! (is-eq (contract-of ft) (unwrap! (var-get Token) ERR_WRONG_TOKEN)) ERR_WRONG_TOKEN)
    (asserts! (> amount u0) ERR_ZERO_AMOUNT)
    (asserts! (<= amount bal) ERR_INSUFFICIENT)
    (asserts! (not (is-eq recipient (as-contract tx-sender))) ERR_INVALID_RECIPIENT)
    (try! (as-contract (contract-call? ft transfer amount tx-sender recipient none)))
    (var-set Balance (- bal amount))
    (print { event: "execute-transfer", caller: contract-caller, recipient: recipient, amount: amount, balance: (var-get Balance) })
    (ok true)
  )
)
