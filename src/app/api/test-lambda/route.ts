import { NextRequest, NextResponse } from 'next/server'
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda'

const LAMBDA_FUNCTION_NAME = process.env.LAMBDA_FUNCTION_NAME || 'echoes-video-compiler-VideoCompilerFunction-JvzfHTxrB5vO'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Lambda connectivity...')
    
    // Check environment variables
    const envCheck = {
      hasAwsAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasAwsSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: process.env.AWS_REGION,
      lambdaFunctionName: LAMBDA_FUNCTION_NAME
    }
    
    console.log('Environment check:', envCheck)
    
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      return NextResponse.json({ 
        error: 'AWS credentials not configured',
        envCheck
      }, { status: 500 })
    }

    // Initialize Lambda client
    const lambdaClient = new LambdaClient({ 
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    })

    // Test with a simple ping payload
    const testPayload = {
      test: true,
      message: 'Connectivity test'
    }

    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTION_NAME,
      InvocationType: 'RequestResponse', // Synchronous for testing
      Payload: JSON.stringify({
        body: JSON.stringify(testPayload)
      })
    })

    console.log('Sending test Lambda command...')
    const response = await lambdaClient.send(command)
    console.log('Lambda test response:', { statusCode: response.StatusCode })
    
    return NextResponse.json({
      success: true,
      message: 'Lambda connectivity test successful',
      statusCode: response.StatusCode,
      envCheck
    })

  } catch (error) {
    console.error('Lambda connectivity test failed:', error)
    return NextResponse.json({
      error: 'Lambda connectivity test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 