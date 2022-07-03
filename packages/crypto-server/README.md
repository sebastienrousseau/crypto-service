![Banner representing Crypto Server](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/crypto-server-logo.svg)

[![NPM Version](https://img.shields.io/npm/v/solid-js.svg?style=for-the-badge)](https://www.npmjs.com/package/@sebastienrousseau/crypto-server)
[![Maintained with Lerna](https://img.shields.io/badge/maintained%20with-lerna-blue?style=for-the-badge)](https://lerna.js.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge&logo=)](https://opensource.org/licenses/MIT)
![Made with Love](https://raw.githubusercontent.com/sebastienrousseau/crypto-service/master/assets/made-with-love.svg)

**[Website](https://cryptosvr.io) • [Documentation](https://cryptosvr.io/docs/) 
• [Submit an Issue](https://github.com/sebastienrousseau/crypto-service/issues) 
• [Contributing Guidelines](https://github.com/sebastienrousseau/crypto-service/blob/master/.github/CONTRIBUTING.md)**

***

## Welcome to Crypto Server

Crypto Server is a [Fastify][3] web server that exposes easy consumable REST
APIs to perform low-level cryptographic operations. It is implemented using
Node.js and relies on [Crypto Lib][2].

It supports the following cryptographic operations:

- Digital Signing,
- Encryption and Decryption,
- Key Generation,
- Key Management,
- Pseudorandom Number Generation,
- Signature Verification.

Development of this server is hosted by [GitHub][6] at the [following page][7].
Source code is available to everyone under the standard [MIT license][8].

## Getting Started

Crypto Server is a [Node.js][4] module available through the [npm registry][5].
Before installing, [download and install Node.js][4]. Node.js 12.20.0 or higher 
is required.

Installation is done using either [`npm`][5],
[`yarn`][9] or [`pnpm`][10] package managers to use Crypto Server with Node.js
or the Command Line Interface:

- `npm i @sebastienrousseau/crypto-server`
- `yarn add @sebastienrousseau/crypto-server`
- `pnpm add @sebastienrousseau/crypto-server`

## Quick start

### Starting the Crypto Server

- Open Terminal for Mac or Command Prompt for Windows,
- Enter one of the following commands to start the Crypto Server:   

#### NPM

- `npm run start:server`

#### Yarn

- `yarn start:server`

#### PNPM

- `pnpm start:server`

This will start the Crypto Server on your local machine with the following
environment details:

- Protocol: http,
- Hostname: localhost,
- Port: 3000,
- IP: 127.0.0.1.

The Crypto Server should be listening on
[http://localhost:3000/](http://localhost:3000/)

## What are the Crypto Service APIs?

The Crypto Service APIs give you access to a range of security and encryption
solutions to perform low-level cryptographic operations, key storage operations,
protect static data, and securely share secrets.

On arrival of a new API request, the Crypto Server performs the request
operation in the host environment, subsequently the response is transferred back
to the requesting application. All operations that are performed andd coming
through the Crypto Server are monitored so statistics can be made and acted upon

The APIs created with Crypto Server should be used with HTTPS endpoints only in
a production web server.

For greater security, you should choose a minimum Transport Layer Security (TLS)
protocol version to be enforced for your API Gateway custom domain. Crypto
Server recommends either a TLS version 1.3 or TLS version 1.3 security policy.

### Commands & Options

#### `/generate`

This endpoint allows you to create a new Key Pair.

|Content-Type|Value|Description|
|---|---|---|
|type|rsa|The primary key algorithm type: ECC (default) or RSA. |
|bits|2048|Number of bits for RSA keys (defaults to 4096 bits). |
|name|Jane Doe|First name and Last name |
|email|jane@doe.com|Email address |
|passphrase|123456789abcdef|The passphrase used to encrypt the private key. |
|curve|null|Elliptic curve for ECC keys. See Appendix for more detail... |
|expiration|0|Number of seconds from the key creation time. |
|format|armored|Format of the output keys e.g. 'armored' | 'object' | 'binary'.|

```shell
curl --location --request GET 'http://localhost:3000/v1/generate' \
--header 'type: rsa' \
--header 'bits: 2048' \
--header 'name: Jane Doe' \
--header 'email: jane@doe.com' \
--header 'passphrase: 123456789abcdef' \
--header 'curve: null' \
--header 'expiration: 0' \
--header 'format: armored'
```

#### `/encrypt`

This endpoint allows you to encrypt data in a single operation.

|Content-Type|Value|Description|
|---|---|---|
|passphrase|123456789abcdef|Passphrase to encrypt the message.|
|message|Hello Crypto Service!|Message to be encrypted.|
|publicKey|{{publicKey}}|A public key.|
|privateKey|{{privateKey}}|A private key.|

```shell
curl --location --request GET 'http://localhost:3000/v1/encrypt' \
--header 'passphrase: 123456789abcdef' \
--header 'message: Hello Crypto Service!' \
--header 'publicKey: LS0tLS1CRUdJTiBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCgp4c0JOQkdLSHhCUUJDQURmS0VyYUVnT1VYZHFKVGVTdnUzb2NPWGg2VytxWllDbndOUFVvRjZpcnREbGUKNzVVYTByYkFUZEsxbXF4S1g0L0hraGhzQllQRXdNRHE0RnVzbkxOK0ZnNVdmdGpSR0M5NmJENnRmbVIzClJZY0p5WTEwTFlDRS9GS21iLzFJRGIrT2RtRk8weEpPSWxaTERSeVJSN0xwUlRDNE1mMkRiaFNheExqcwpZdFVhaFZPcCtNeHBkNmFWektYYUpkVVVmVWRYbVliRnpaM0YzK1RMa01zMFdaY05vRDJ3bWNpSGJVUXIKT1JnRkhoQ0I2dUNLNEs3d2R4OStjTllkTkQyb2t6WjJTdmRVenQ3QUZrajFra05XeVM3VWprWmVEdm9UCmp5dFNpZXFMQWJ3L2NUaXRrTjJ1MlZJU1UxMHEwbFhMSERaWWFXTll1OHRMaHFYM0F4c3FNQ1V0QUJFQgpBQUhORjBwaGJtVWdSRzlsSUR4cVlXNWxRR1J2WlM1amIyMCt3c0NLQkJBQkNBQWRCUUppaDhRVUJBc0oKQndnREZRZ0tCQllBQWdFQ0dRRUNHd01DSGdFQUlRa1E5L09ucUlLaTh2RVdJUVExYXRBVHl5WTZZcDFoCjN6ZjM4NmVvZ3FMeThZeUFDQUNudlF1aFMxeHV2YnhUQVdZcWkrcjNFUkpOSzVINUFkOWpFNERUWUZPTQowcDRuMmJwSlQwa2t1bkMzckp0Z2tQbnRNVFJ6eEJvS0QrcmRIdS9FZno1MjNPMENJbjlCOG8vWWpvencKQVFBMldHLzhIdlRYOU0yZVUzOVM3SkptS1I4aks5TDVtYlduV1I2eEZadExSc0pIT2FzSm50S1BsUkFSCnpXNmwweTNjRzRueFJieHM2QS9tczFjM05seDdodjErN24yaTN6d3l2aE52Rys5Y0F0TlM3L3NkLzExbgpYQUJ0QWt2WjU3SnUwWXBKQ3JuMHhvblJuN0kyQ1lTd1BNVTZKMTFIL2l5eXdTNFB5aHlrV2lHMmhNNC8KM3ZMVDdpQVoxZlhkczk0SDFQTW9zNEZMbU50YkphSC83OXRyRFNpem1zY0ExbG9IUlFSOHVvNElKNkx6CnpzQk5CR0tIeEJRQkNBRHNNblVIWkVydTl5V2ljYjRxajJxWGhuanFSOVZHZVdvaEd1UFNRc2dpLzNRRQp4K3FJSjJFeU1LelQ1aXRYT01tQU1pbk5GRGd3ek1FQ081Nk53TWdWUXJnSm5LdnNGR0gxdVFUb0MzaHcKR1pjUDArUTB0aThPWmFLOUZFbngra1FYNXJjYWRGWTBSOW9KTEFNS1JzOU45YmJ2eU40VzRCMW5weklmClF6NWloMUNIQnRqektpVTdaVzBKM1ZLa285NHp4bGZiZVRKS2ZxWnl4eGtuMVVPZWliWWp4dGYrZXZKaQpPOUZMUGpOcGkwem8zZ3kvQ1Y5UGtDUjA3c295aTVJeVVNNE9CRzBoRFNjV2Z4a0xEc0M0b0tzTjJhaGYKeHovSWc0em9FNUk2L0t5c2U1QW1GaWZSaHhaUnRhY3JyOTBqazc4a2Q1S0p6WXhETXhTK0ZzUUJBQkVCCkFBSEN3SFlFR0FFSUFBa0ZBbUtIeEJRQ0d3d0FJUWtROS9PbnFJS2k4dkVXSVFRMWF0QVR5eVk2WXAxaAozemYzODZlb2dxTHk4WDBTQ0FDY0FFTWQ2c2JvVHVOZlVPb2RaQjdvM25NV2RDMEVja1kzSnhLbFE3b0kKV0hpUTNTdU9ibXduWGhSTHJ4TTZ4ZmtUQ3pYK2FUQ2NCemhlZmFMWVU4R1BsSU00SFRhank0MHVNb2Y2CkV3SnpFenpucjhZRVVmdU1Pd094anFrZHpjK2llbk9lT2V6b2dQeTFieGtZTmpHeHpaTFFUekptMkhXWAowOFlNWWtqMXJNTmg0VGZQMnZaYUFHem5LMHBrb0lHdVBHQTdPTTVpRHFIa3pyeWppWG1pV1VVM1lTcHYKMTV5VkEyQXBxN2o1ZFJWd2d4eFpLS2xhOW5iaXhYUEdhTVFSV0w3RUcxM0pMbTFidVlxUXVsVExyMTNkClByKzR2NStlQ3NEZkRpcU9veFYyU000R0ZxanBaRUFBNEZlZFlTMmx1ZXV3WUdvVnRtT1BOdjViME9iUAo9YTZHRQotLS0tLUVORCBQR1AgUFVCTElDIEtFWSBCTE9DSy0tLS0tCg==' \
--header 'privateKey: LS0tLS1CRUdJTiBQR1AgUFJJVkFURSBLRVkgQkxPQ0stLS0tLQoKeGNNR0JHS0h4QlFCQ0FEZktFcmFFZ09VWGRxSlRlU3Z1M29jT1hoNlcrcVpZQ253TlBVb0Y2aXJ0RGxlCjc1VWEwcmJBVGRLMW1xeEtYNC9Ia2hoc0JZUEV3TURxNEZ1c25MTitGZzVXZnRqUkdDOTZiRDZ0Zm1SMwpSWWNKeVkxMExZQ0UvRkttYi8xSURiK09kbUZPMHhKT0lsWkxEUnlSUjdMcFJUQzRNZjJEYmhTYXhManMKWXRVYWhWT3ArTXhwZDZhVnpLWGFKZFVVZlVkWG1ZYkZ6WjNGMytUTGtNczBXWmNOb0Qyd21jaUhiVVFyCk9SZ0ZIaENCNnVDSzRLN3dkeDkrY05ZZE5EMm9reloyU3ZkVXp0N0FGa2oxa2tOV3lTN1Vqa1plRHZvVApqeXRTaWVxTEFidy9jVGl0a04ydTJWSVNVMTBxMGxYTEhEWllhV05ZdTh0TGhxWDNBeHNxTUNVdEFCRUIKQUFIK0NRTUlhRCtXMXJEYitZN2cweXB1M2h0UElQSXZUYm15dkNMOUZKVitLZzdrRFZHVG5QR1Q0NGhMCm9GRXZrNEZIeHdjSHp4SytjLzUvQnltM2JqWlMzMStDNTBqbTQvUDYrVGVPWGRXakVBT1JSQUJxb05pRgpVcUcrSWpiZnlvbkFzSEx5aVcrQ1BDczJyVnlJQTRCdGhHWHBtRmtYQnpIYk5QSTE3cThvS2ZBQnViY3oKeVYrbkxzd1g4TC9md1lRcHRmTjZ2ZGVhNjVUMzdOTGYzWGdkU29SVUx5ZnpsK1VSVEE5dW1kNDRHWUQrCk9pZk1hb2tKZ3E4RENMWHk3R2VYeDh1V1Fod1l3N2hYV3JhWXUyU21VdjdDaWxDeG9QRkNORnh6aFdiQgoraHlpbWVZam9KbS9VeEJtbEZZSHY0c3Mrb21NazhQQ2M3L1Z3WEZ5U0xpL2M5Q3ROakVCamJIaGZ6VlEKSVFtSVd2aUhibkwzSVNmdkFvR2tPMHBQMHhmczh3dGx6RVhqRm9aRXlUeW1vOGhROXV4V1BxNVFjSkxrCkZrcmhZcUZqYndIMjc3Szd2K2dESHp2SDlHSnljYlhMZHpyVzNmMERPM1NUNHlrcHFQaWdTeHRiMkE1Tgo1STlIbTZmOFl1KzVUNWlVajFiUVdJOEErR0VkZXI5VTl0RjdpN2QycHB2S2VvL0ZxUU10eUh2Wm0zaG4KNmNQNFpyd09Kdmk5b0lsaVhXdHZySWM0QU5SV0FSSks5WkswTlZsdlZxOGEzR1l6SUY3ODNzeTM5dTZ2ClJCeHI4dll3WC9KSjNPR2tnVWlhVW12czBTNmhxU0d5RkRubi9kbUZ6elBlTzZ5eGl2WkhkeWs5T0pGSAo4N0hMdmF6WFdhWExkbWlPOU1WWFpRYWM3NlI1RTZodTk0U0ZRWjZ3YWRsTGxWeW43V0MzT1BYeHFzOXYKS2hyRzk2TkJqYTl3bnBqSFVLb1NDbG9PQW16UEVKWW54a2xGQXhucWJNQ1lCUGV4bFpqKzNzbVY4RWVmCnpmSHJrOTdFZmNEWHZtQTAwK0RtaXYzbi9hampQUjIyTTh5QVkyRFFlbHM4YThZbU1ZMm5JTldyVUIySgoxa1VJcW5rVVc0SmtwY29OZUlQbUJKVTZRSC9pYm9zVTdicW56OG1EZm9QenAyWjYwZ0ZNUEpjM0hISTUKb2JtSW9TUFJUWG85THBkWjdZRmUzUnZ0cDFKVHgzM3F6UmRLWVc1bElFUnZaU0E4YW1GdVpVQmtiMlV1ClkyOXRQc0xBaWdRUUFRZ0FIUVVDWW9mRUZBUUxDUWNJQXhVSUNnUVdBQUlCQWhrQkFoc0RBaDRCQUNFSgpFUGZ6cDZpQ292THhGaUVFTldyUUU4c21PbUtkWWQ4MzkvT25xSUtpOHZHTWdBZ0FwNzBMb1V0Y2JyMjgKVXdGbUtvdnE5eEVTVFN1UitRSGZZeE9BMDJCVGpOS2VKOW02U1U5SkpMcHd0NnliWUpENTdURTBjOFFhCkNnL3EzUjd2eEg4K2R0enRBaUovUWZLUDJJNk04QUVBTmxodi9CNzAxL1RObmxOL1V1eVNaaWtmSXl2UworWm0xcDFrZXNSV2JTMGJDUnptckNaN1NqNVVRRWMxdXBkTXQzQnVKOFVXOGJPZ1A1ck5YTnpaY2U0YjkKZnU1OW90ODhNcjRUYnh2dlhBTFRVdS83SGY5ZFoxd0FiUUpMMmVleWJ0R0tTUXE1OU1hSjBaK3lOZ21FCnNEekZPaWRkUi80c3NzRXVEOG9jcEZvaHRvVE9QOTd5MCs0Z0dkWDEzYlBlQjlUektMT0JTNWpiV3lXaAovKy9iYXcwb3M1ckhBTlphQjBVRWZMcU9DQ2VpODhmREJnUmloOFFVQVFnQTdESjFCMlJLN3ZjbG9uRysKS285cWw0WjQ2a2ZWUm5scUlScmowa0xJSXY5MEJNZnFpQ2RoTWpDczArWXJWempKZ0RJcHpSUTRNTXpCCkFqdWVqY0RJRlVLNENaeXI3QlJoOWJrRTZBdDRjQm1YRDlQa05MWXZEbVdpdlJSSjhmcEVGK2EzR25SVwpORWZhQ1N3RENrYlBUZlcyNzhqZUZ1QWRaNmN5SDBNK1lvZFFod2JZOHlvbE8yVnRDZDFTcEtQZU04WlgKMjNreVNuNm1jc2NaSjlWRG5vbTJJOGJYL25yeVlqdlJTejR6YVl0TTZONE12d2xmVDVBa2RPN0tNb3VTCk1sRE9EZ1J0SVEwbkZuOFpDdzdBdUtDckRkbW9YOGMveUlPTTZCT1NPdnlzckh1UUpoWW4wWWNXVWJXbgpLNi9kSTVPL0pIZVNpYzJNUXpNVXZoYkVBUUFSQVFBQi9na0RDSHVaSUcyc3YvenM0SEhaWEpoMFdKa2kKWitkbjFqYUw3RXowdjVuRzBTWDh6cjFaYWwxU2ZmZFNHcDRFampSbEdNRVdhK25pdkhIQW1QcWdXN0JTCldJdmhYNWN6VTQ0NU1ZOG1TOXFjOGRZT1VMa0FOVUhoTzFtZlZ1U2d6RHdPZUl3eTg4NlkydnVLWnJ1UgpsVm1wZjJ2L1lVdDBDNzNkdTVpZ1hoQmlMMVhJbS93MHFwL2FZN1NmRmNUeEJ2UTVjL1BrSUtmZ2pJeDYKOStRejJ4ZllYSnk5M0Z4MjF0MVMwUFFvRHdTcFZvVjdkc1lRS3ZhMWcyRGNpTmM4UW1TYTV1QlN5ckZ4CjJNaG5MdTY4eTg5SnFNNEgzWjBvUTg2RGhxREE0eWFWaFlnRk1qQ0RSRVJRVXFhb1dBWWJqcHQyVHpHWQphb0tZUVI1VGprbDd1VnFQSlZia3BQbFZXdnJNNDVQblpxSkpjSWdlNmIvVHhoNkE5WWVRaTRtVi9LS3MKS1ZqUWd5OXFUT2V3cmZGNERiODVXdjRiekhEckZyR3hGbVNZTWVPY1h2ZVl0TGZPVlM5RmpiQ1pJZ0U1ClBRaUtXWDNzeXViVHg2eEw1aGUxUVl0SUdoaUJmZS9TV3Z0WUoxZlJUT3Y1MFBkM3JRSjB4ZVJmQ2hONgpQbkQ3ZzBGQ2xIeFJvc1k4dld5ZXNUenVpdUMxTWhPTzlqaGNwVGZpR05wU0dpNjdUNlIzcjVmdTNtSmEKb1UrcGlRSGVDaGhjSjRIeFZkQ24rQ05QS1VqQ3N0RnY0MndvRlMvOHZJeksvZkswZjQzVlRERWtVeUtPClUxUWZiNWRianNrYWpTY3NKd09FYklaeFdySkVDcUtPd2RRaHVMakpnLzNlQldtZUh3NCtWeGJsTFo5MQpvVFZWN1B0MjlqUm50WDN4VXl4d2pSVHVVK0toZ3pVSTFySFAzNCt0NTFoYVR1WmlWbTZFaU1MNUxJTkcKenFvbGgwc0pUcW9JZ1BKNTZtQmFieFcxUmtUMCthWEVXWlY4b0RoK0xoY2d0VGoyd201bXgwUnBmZCswCkJGWmQvTE9EaDBrTGF6ZW14TkRReU5MWVRTbXQwK3hqcUIvUnFlVEZkZ0U3dSthMTFTZm1MejJRaDRBVApvRU5qVS9YREFoWERkQlQ0TkhqOGxtbGxWV0RueGJ4b2xPOE9hWGhVREVsOTBCKzN0S2EyY3d4WnI2ckQKZWNMQWRnUVlBUWdBQ1FVQ1lvZkVGQUliREFBaENSRDM4NmVvZ3FMeThSWWhCRFZxMEJQTEpqcGluV0hmCk4vZnpwNmlDb3ZMeGZSSUlBSndBUXgzcXh1aE80MTlRNmgxa0h1amVjeFowTFFSeVJqY25FcVZEdWdoWQplSkRkSzQ1dWJDZGVGRXV2RXpyRitSTUxOZjVwTUp3SE9GNTlvdGhUd1krVWd6Z2ROcVBMalM0eWgvb1QKQW5NVFBPZXZ4Z1JSKzR3N0E3R09xUjNOejZKNmM1NDU3T2lBL0xWdkdSZzJNYkhOa3RCUE1tYllkWmZUCnhneGlTUFdzdzJIaE44L2E5bG9BYk9jclNtU2dnYTQ4WURzNHptSU9vZVRPdktPSmVhSlpSVGRoS20vWApuSlVEWUNtcnVQbDFGWENESEZrb3FWcjJkdUxGYzhab3hCRll2c1FiWGNrdWJWdTVpcEM2Vk11dlhkMCsKdjdpL241NEt3TjhPS282akZYWkl6Z1lXcU9sa1FBRGdWNTFoTGFXNTY3QmdhaFcyWTQ4Mi9sdlE1czg9Cj1rTjFICi0tLS0tRU5EIFBHUCBQUklWQVRFIEtFWSBCTE9DSy0tLS0tCg=='
```

#### `/decrypt`

This endpoint allows you to decrypt data in a single operation.

|Content-Type|Value|Description|
|---|---|---|
|passphrase|123456789abcdef|Passphrase to decrypt the message.|
|message|{{data}}|Message to be decrypted.|

```shell
curl --location --request GET 'http://localhost:3000/v1/decrypt' \
--header 'passphrase: 123456789abcdef' \
--header 'message: LS0tLS1CRUdJTiBQR1AgTUVTU0FHRS0tLS0tCgp3Y0ZNQXpMNWFTdVU0RWM4QVJBQWtnUUVEMVNwaTN5MmRrME1kbHQwYmtsMEdIWEoxbytxZHdzeWxZdlIKcjVycGVydXVmeWd3V0JTR1p6UHNSMG51MFg4SWxIQ0hYR2pha0N2WFVhMEZHTFNHR2pqRHdZQmViZjAvCitIVE51K1BMYzRvVmlvMXAwZEZraFFuOVVHSG82b1NVQmNqcmdsWTlsTW4ySzg3RVp2M1BUZ2k3aGtiMwpOWVhFazl5dWdLalVGU1RtMERDdGdpNkt2YUpycURpZStLbnJxSVNrckpxS0I0T1FuOUlNQk1UY3kxVEgKQld2QStyQ2llSFBNRHIrNFRwbTU5cFgxQUhCb0xPRm9WK1c1YlJoNEY5VHVxNzRaMW9pV2cyUFFEM252CjFtdnlZN1VIdEVuczBFbzYvWFRTQnZzNndQdFBJT2FoWGlTSC9UYmNod1RNTjlBZ1NSa3YzeEpWcGhjSgpPaGRGaFNMQ1dSUlR5UGxlUWpNeEoyemwwRm1JM2IrZnNYUkZlKzRCRjhiQjl6MUV4Nk9KOE1raG9yOFYKN3B5ZHR2UUVBVFlXMHVEc3pNb09UNHhqYnUvL29ESk45dnRINnBTY1hnQ3o2MGI4TTdHaXl6VGFoV3FLCmsvSklVWHJORjB2cjk3RWVnRGs3VXNFV3Y4MFhYdkg3dEtVTFNQcnRSTmxnbytqSjk5SzBmcm9iK1QxQwpIcVp4UzdpZCsxaTJOOHhQcUZnd2lDeHhXS1dMTGllQW1GRVVuQ3NXYUR0b05OZUhYbkJyLzk5b25PZGoKd0pWT0krQS9uZlU5bXh2ZGFnWlNqWnlMQ0ZDa1REQ05GeWxKL0dmUnZIWndBNGsya0ZqZXUvQWhQa0Y5Ck1EQktZdmNSWFJudklLOW5STHhIYjZKMUpoS3ppbnFpbHgrZmpQak9kdVRTd2NzQnlicThXenRPbmpscwp3WkZZVU9uQjdsQ0N4d3lxc3hqNlBQdkpLODFTOTBhaElQMkNUVVVsWWlMWTRSa05qRjlwNnArSXZoVW4KeFB3UXFwSU03V2ZpckZOM0tJT3QrOWpyazE3YStFVWtOelBuNm5jMHdobTUzWDFtaWhHOEJPYXc5UFgwCmlSWHZuTTlEL0dkWHI4ZTNhWDFRTnBXOVVlKzZ5c1NqZi85bEs5MVo5aTl4eUpmSW51eS9EdXpjSGtYawpTa1Z5VjRablE3MCsrY0JvN1JaYUkzZ3Zuak9HYkF2Z3dVakJIYUoyL0Vqd0oyd1FESm9lbkVYdUFEeTcKOHhLRWk2V2p3V1lBUXVlUmh1cGdhYmJIcVFGazltTWhHSGcvMlpkNkViMTYyTmVYeTU2RkYrK1lWSm5jCnJrSVN5bkFmdWJSc1hmZXUxYS9TWWJvR2h0cTNheWQ3VTM3YVpCUmtuclFieldxYituV2YvRk54YkRvRAprTkpsV1BDSHZBeHhNRTd3U2gxRkZQNmtCL24yVWxTV1JNUWZwY25hbzFFUW9QUGdQcWtDcm9vSXh4WVMKWEsySlEzOWtucmpmY053bEJZYlVkZnlNaVlSRi84cHJxT25YU242czJDTUN6WjAzamlNeEpYYmFDS0N6CnNqVXpmMDVMTnJ5V01nR0dmQWFRcWZhN3NYM3NtL3VjL09IV25paFpVaWsrVlZQbzNPVGE1NG0vRnd2YgpjQmxseFV6UHVYSzg3NG1lQVNPanRZc2luOUQzVnNIWVdHa0g5azJ6eFgyZEU1cTZUeGxUaU9FOWx0UHUKRWxmWXloU1dtMXJYVUxDZmprYkE2TjlSSEFMR0VNU0Uwa3p1QXpGZmh0OFlpVkhxcHZULytrWjF1azA3ClZLejhnS09UQllMNG84ZWt6V2ZJZ2N3MThkcmZ4SThIUHQ1cUtEZzJpUUM3M1BBS1gxaEJxVHp4LzJSbAptS2FBeFZ5NW1yanVwWmV3RnpMc2tiYlRhYWszd0Y2eHZVWktFNmFHdFRFcnZIVWJlL0xoL00zajVBQTQKUGRZQSs3djZMd3BTcGRVYTRQK2xKb0d0SVQremRQTXF2TE1Od3lyYk9nSWVveEZXZHNxQk9qM1kwNk0xCmhJUk9IamRnVG9yUUhvOD0KPTh4MUMKLS0tLS1FTkQgUEdQIE1FU1NBR0UtLS0tLQo='
```

## Contributing to Crypto Server

Contributions to Crypto Server are welcomed and encouraged! Please see our 
[Contributing Guidelines][1] for further details on the process for submitting
pull requests to us.

## Appendix

*Elliptic curve for ECC keys: curve25519, p256, p384, p521, secp256k1,
brainpoolP256r1,brainpoolP384r1, or brainpoolP512r1.*

[1]: https://github.com/sebastienrousseau/crypto-server/blob/master/.github/CONTRIBUTING.md
[2]: https://github.com/sebastienrousseau/crypto-service/tree/main/packages/crypto-lib
[3]: https://www.fastify.io
[4]: https://nodejs.org/en/
[5]: https://www.npmjs.com/
[6]: https://github.com
[7]: https://github.com/sebastienrousseau/crypto-server
[8]: https://github.com/sebastienrousseau/crypto-server/blob/main/LICENSE
[9]: https://yarnpkg.com/getting-started
[10]: https://pnpm.io/motivation
