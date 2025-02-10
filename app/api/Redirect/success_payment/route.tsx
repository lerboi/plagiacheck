import { NextResponse } from "next/server"

export async function GET(req: Request) {
  // If you need to handle any success payment logic, do it here
  
  // Redirect to the success page
  return NextResponse.redirect('https://anione.me/en/Redirects/success-packages', {
    status: 302 // Using 302 for temporary redirect
  })
}