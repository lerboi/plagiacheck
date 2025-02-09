'use client'
import { useEffect } from "react"

export default function Redirects(){

    useEffect(() => {
        async function callPayment(){
            const response = await fetch("/api/create-checkout-session-a", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    priceId: "price_1QqWVeAJsVayTGRctEvFA5UQ",
                    email: "leroyzzng@gmail.com"
                })
            });
        }
        callPayment()
    })

    return(
        <h2>testing</h2>
    )
}