#!/bin/bash

# Echoes Video Compiler Lambda Deployment Script

set -e

echo "🚀 Deploying Echoes Video Compiler Lambda Function..."

# Function to prompt for input
prompt_for_input() {
    local prompt="$1"
    local var_name="$2"
    local is_secret="$3"
    
    echo -n "$prompt: "
    if [ "$is_secret" = "true" ]; then
        read -s value
        echo ""
    else
        read value
    fi
    
    if [ -z "$value" ]; then
        echo "❌ Error: Value cannot be empty"
        exit 1
    fi
    
    eval "$var_name='$value'"
}

# Get Supabase credentials
echo "📋 Please provide your Supabase credentials:"
echo "   (You can find these in your Supabase project settings → API)"
echo ""

prompt_for_input "Supabase Project URL (e.g., https://abc123.supabase.co)" "SUPABASE_URL" "false"
prompt_for_input "Supabase Service Role Key" "SUPABASE_SERVICE_ROLE_KEY" "true"

echo ""
echo "🔐 Storing credentials in AWS Parameter Store..."

# Store parameters in AWS Systems Manager
aws ssm put-parameter \
    --name "/echoes/prod/supabase/url" \
    --value "$SUPABASE_URL" \
    --type "String" \
    --overwrite \
    --description "Supabase project URL for Echoes video compilation"

aws ssm put-parameter \
    --name "/echoes/prod/supabase/service_role_key" \
    --value "$SUPABASE_SERVICE_ROLE_KEY" \
    --type "SecureString" \
    --overwrite \
    --description "Supabase service role key for Echoes video compilation"

echo "✅ Credentials stored securely in AWS Parameter Store"

# Build and deploy with SAM
echo "📦 Building Lambda function..."
sam build

echo "🚀 Deploying to AWS..."
sam deploy --guided

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Note the API Gateway endpoint URL from the output above"
echo "2. Add this URL to your frontend application"
echo "3. Test the video compilation functionality"
echo ""
echo "🔐 Security note: Your credentials are now stored securely in AWS Parameter Store"
echo "   They are encrypted and only accessible by the Lambda function" 