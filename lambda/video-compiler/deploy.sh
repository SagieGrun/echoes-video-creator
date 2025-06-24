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

# Check if credentials already exist in AWS Parameter Store
echo "🔍 Checking for existing credentials..."

EXISTING_URL=$(aws ssm get-parameter --name "/echoes/prod/supabase/url" --query "Parameter.Value" --output text 2>/dev/null || echo "")
EXISTING_KEY=$(aws ssm get-parameter --name "/echoes/prod/supabase/service_role_key" --with-decryption --query "Parameter.Value" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_URL" ] && [ -n "$EXISTING_KEY" ]; then
    echo "✅ Found existing credentials in AWS Parameter Store"
    echo "   URL: $EXISTING_URL"
    echo "   Key: [HIDDEN]"
    echo ""
    echo "💡 Using existing credentials. To update them, delete the parameters first:"
    echo "   aws ssm delete-parameter --name '/echoes/prod/supabase/url'"
    echo "   aws ssm delete-parameter --name '/echoes/prod/supabase/service_role_key'"
else
    echo "📋 No existing credentials found. Please provide your Supabase credentials:"
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
fi

# Build and deploy with SAM
echo "📦 Building Lambda function..."
sam build

echo "🚀 Deploying to AWS..."

# Check if samconfig.toml exists (indicates previous deployment)
if [ -f "samconfig.toml" ]; then
    echo "✅ Found existing SAM configuration, using previous settings..."
    sam deploy
else
    echo "📋 First deployment detected, running guided setup..."
    sam deploy --guided
fi

echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Note the API Gateway endpoint URL from the output above"
echo "2. Add this URL to your frontend application"
echo "3. Test the video compilation functionality"
echo ""
echo "🔐 Security note: Your credentials are now stored securely in AWS Parameter Store"
echo "   They are encrypted and only accessible by the Lambda function" 