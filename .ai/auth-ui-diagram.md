# Authentication UI Architecture Diagram

## 1. Component Hierarchy

```mermaid
graph TB
    subgraph "Astro Pages"
        AuthPage["/auth<br/>auth.astro"]
        VerifyPage["/auth/verify-email<br/>verify-email.astro"]
        ResetPage["/auth/reset-password<br/>reset-password.astro"]
        UpdatePage["/auth/update-password<br/>update-password.astro"]
        HomePage["/<br/>index.astro"]
    end

    subgraph "Layout Components"
        Layout["Layout.astro"]
        Header["Header.tsx"]
    end

    subgraph "Auth Islands (React)"
        AuthIsland["AuthIsland.tsx<br/>client:load"]
        VerifyIsland["VerifyEmailIsland.tsx<br/>client:load"]
        ResetIsland["ResetPasswordIsland.tsx<br/>client:load"]
        UpdateIsland["UpdatePasswordIsland.tsx<br/>client:load"]
    end

    subgraph "Auth Container Components"
        AuthContainer["AuthContainer.tsx"]
        AuthModeToggle["AuthModeToggle.tsx"]
        ErrorMessage["ErrorMessage.tsx"]
    end

    subgraph "Form Components"
        LoginForm["LoginForm.tsx"]
        RegisterForm["RegisterForm.tsx"]
        ResetPasswordForm["ResetPasswordForm.tsx"]
        UpdatePasswordForm["UpdatePasswordForm.tsx"]
    end

    subgraph "Hooks"
        useAuthForm["useAuthForm.ts"]
        useAuth["useAuth.ts"]
    end

    subgraph "State Management"
        AuthStore["auth.ts (Zustand)"]
    end

    AuthPage --> Layout
    VerifyPage --> Layout
    ResetPage --> Layout
    UpdatePage --> Layout
    HomePage --> Layout

    Layout --> Header
    Header --> AuthStore

    AuthPage --> AuthIsland
    VerifyPage --> VerifyIsland
    ResetPage --> ResetIsland
    UpdatePage --> UpdateIsland

    AuthIsland --> AuthContainer
    AuthContainer --> AuthModeToggle
    AuthContainer --> ErrorMessage
    AuthContainer --> LoginForm
    AuthContainer --> RegisterForm

    ResetIsland --> ResetPasswordForm
    UpdateIsland --> UpdatePasswordForm

    LoginForm --> useAuthForm
    RegisterForm --> useAuthForm
    ResetPasswordForm --> useAuthForm
    UpdatePasswordForm --> useAuthForm

    useAuthForm --> AuthStore
    useAuth --> AuthStore
```

## 2. Authentication User Flows

### 2.1 Registration Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant AuthPage as /auth
    participant RegisterForm
    participant API as POST /api/auth/register
    participant Supabase as Supabase Auth
    participant Email as Email Service
    participant Callback as /api/auth/callback
    participant Home as /

    User->>AuthPage: Navigate to /auth
    AuthPage->>AuthPage: Check session (redirect if authenticated)
    User->>RegisterForm: Fill email & password
    User->>RegisterForm: Click "CREATE ACCOUNT"

    RegisterForm->>RegisterForm: Client-side validation
    alt Validation fails
        RegisterForm-->>User: Show inline errors
    end

    RegisterForm->>API: POST {email, password}
    API->>Supabase: auth.signUp()

    alt Email exists
        Supabase-->>API: Error: user already registered
        API-->>RegisterForm: 409 EMAIL ALREADY REGISTERED
        RegisterForm-->>User: Show error message
    else Success
        Supabase->>Email: Send verification email
        Supabase-->>API: User created (unverified)
        API-->>RegisterForm: 201 {user, message}
        RegisterForm->>User: Redirect to /auth/verify-email
    end

    Note over User,Email: User checks email inbox

    User->>Email: Click verification link
    Email->>Callback: GET /api/auth/callback?code=xxx&type=signup
    Callback->>Supabase: Exchange code for session
    Supabase-->>Callback: Session tokens
    Callback->>Callback: Set HTTP-only cookies
    Callback->>Home: Redirect to /
    Home-->>User: Authenticated home page
```

### 2.2 Login Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant AuthPage as /auth
    participant LoginForm
    participant API as POST /api/auth/login
    participant Supabase as Supabase Auth
    participant Home as /

    User->>AuthPage: Navigate to /auth
    AuthPage->>AuthPage: Check session
    alt Already authenticated
        AuthPage->>Home: Redirect to /
    end

    User->>LoginForm: Fill email & password
    User->>LoginForm: Click "LOGIN"

    LoginForm->>LoginForm: Client-side validation
    alt Validation fails
        LoginForm-->>User: Show inline errors
    end

    LoginForm->>API: POST {email, password}
    API->>Supabase: auth.signInWithPassword()

    alt Invalid credentials
        Supabase-->>API: Error: invalid login
        API-->>LoginForm: 401 WRONG EMAIL OR PASSWORD
        LoginForm-->>User: Show error, clear password
    else Email not verified
        Supabase-->>API: Error: email not confirmed
        API-->>LoginForm: 403 VERIFY YOUR EMAIL FIRST
        LoginForm-->>User: Show error with resend option
    else Success
        Supabase-->>API: Session tokens
        API->>API: Set HTTP-only cookies
        API-->>LoginForm: 200 {user, profile}
        LoginForm->>Home: Redirect to /
        Home-->>User: Authenticated home page
    end
```

### 2.3 Password Reset Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant ResetPage as /auth/reset-password
    participant ResetForm as ResetPasswordForm
    participant API as POST /api/auth/reset-password
    participant Supabase as Supabase Auth
    participant Email as Email Service
    participant Callback as /api/auth/callback
    participant UpdatePage as /auth/update-password
    participant UpdateForm as UpdatePasswordForm
    participant UpdateAPI as POST /api/auth/update-password
    participant Home as /

    User->>ResetPage: Navigate to /auth/reset-password
    User->>ResetForm: Enter email
    User->>ResetForm: Click "SEND RESET LINK"

    ResetForm->>API: POST {email}
    API->>Supabase: auth.resetPasswordForEmail()
    Supabase->>Email: Send reset email (if user exists)
    API-->>ResetForm: 200 (always success for security)
    ResetForm-->>User: CHECK YOUR EMAIL FOR RESET LINK

    Note over User,Email: User checks email inbox

    User->>Email: Click reset link
    Email->>Callback: GET /api/auth/callback?code=xxx&type=recovery
    Callback->>Supabase: Exchange code for session
    Supabase-->>Callback: Session tokens
    Callback->>Callback: Set HTTP-only cookies
    Callback->>UpdatePage: Redirect to /auth/update-password

    User->>UpdateForm: Enter new password (x2)
    User->>UpdateForm: Click "UPDATE PASSWORD"

    UpdateForm->>UpdateForm: Validate passwords match
    UpdateForm->>UpdateAPI: POST {password}
    UpdateAPI->>Supabase: auth.updateUser({password})

    alt Success
        Supabase-->>UpdateAPI: Password updated
        UpdateAPI-->>UpdateForm: 200 PASSWORD UPDATED
        UpdateForm->>Home: Redirect to /
        Home-->>User: Authenticated home page
    else Weak password
        Supabase-->>UpdateAPI: Error
        UpdateAPI-->>UpdateForm: 400 PASSWORD TOO WEAK
        UpdateForm-->>User: Show error
    end
```

### 2.4 Logout Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Header
    participant AuthStore as Zustand Auth Store
    participant API as POST /api/auth/logout
    participant Supabase as Supabase Auth
    participant Home as /

    User->>Header: Click "LOGOUT"
    Header->>AuthStore: logout()
    AuthStore->>API: POST /api/auth/logout
    API->>Supabase: auth.signOut()
    Supabase-->>API: Success
    API->>API: Clear HTTP-only cookies
    API-->>AuthStore: 200 LOGGED OUT
    AuthStore->>AuthStore: Clear user state
    AuthStore->>AuthStore: Refresh usage (anonymous)
    AuthStore-->>Header: State updated
    Header-->>User: Show LOGIN button
```

## 3. State Management

```mermaid
stateDiagram-v2
    [*] --> Loading: App Initialize

    Loading --> Anonymous: No valid session
    Loading --> Authenticated: Valid session found
    Loading --> EmailPending: Session but email unverified

    Anonymous --> Loading: Click LOGIN
    Anonymous --> Authenticated: Successful login

    EmailPending --> Authenticated: Email verified
    EmailPending --> Anonymous: Logout

    Authenticated --> Anonymous: Logout
    Authenticated --> PasswordReset: Request reset

    PasswordReset --> Authenticated: Password updated
    PasswordReset --> Anonymous: Cancel/Timeout

    state Anonymous {
        [*] --> ShowLoginButton
        ShowLoginButton --> ShowDailyLimit: Usage tracked by IP
    }

    state Authenticated {
        [*] --> ShowUserEmail
        ShowUserEmail --> ShowCredits: Weekly credits displayed
        ShowCredits --> ShowUnlimited: Has API key
    }

    state EmailPending {
        [*] --> ShowVerificationMessage
        ShowVerificationMessage --> WaitingForClick: Email sent
    }
```

## 4. API Endpoint Architecture

```mermaid
graph LR
    subgraph "Client (Browser)"
        Forms["Auth Forms"]
        Store["Zustand Store"]
        Cookies["HTTP-only Cookies"]
    end

    subgraph "Astro Middleware"
        MW["middleware/index.ts"]
        CookieParser["Cookie Parser"]
        SessionValidator["Session Validator"]
    end

    subgraph "API Routes (/api/auth/)"
        Register["POST /register"]
        Login["POST /login"]
        Logout["POST /logout"]
        Session["GET /session"]
        ResetPwd["POST /reset-password"]
        UpdatePwd["POST /update-password"]
        Callback["GET /callback"]
        Refresh["POST /refresh"]
        Resend["POST /resend-verification"]
    end

    subgraph "Services"
        AuthService["auth.service.ts"]
        ProfileService["profile.service.ts"]
    end

    subgraph "Supabase"
        SupaAuth["Supabase Auth"]
        SupaDB["PostgreSQL"]
    end

    Forms --> Register
    Forms --> Login
    Forms --> ResetPwd
    Forms --> UpdatePwd
    Store --> Logout
    Store --> Session

    MW --> CookieParser
    CookieParser --> SessionValidator
    SessionValidator --> SupaAuth

    Register --> AuthService
    Login --> AuthService
    Logout --> AuthService
    Session --> AuthService
    ResetPwd --> AuthService
    UpdatePwd --> AuthService
    Callback --> AuthService
    Refresh --> AuthService
    Resend --> AuthService

    AuthService --> SupaAuth
    AuthService --> ProfileService
    ProfileService --> SupaDB

    AuthService --> Cookies
    Cookies --> MW
```

## 5. Form Validation Flow

```mermaid
flowchart TD
    subgraph "Client-Side Validation"
        Input[User Input]
        Email{Email valid?}
        Password{Password 8-72 chars?}
        Confirm{Passwords match?}
        ClientOK[Validation Passed]
        ClientErr[Show Inline Error]
    end

    subgraph "Server-Side Validation"
        Submit[Submit to API]
        Zod{Zod Schema}
        Business{Business Rules}
        ServerOK[Process Request]
        ServerErr[Return Error Response]
    end

    subgraph "Error Display"
        FormErr[Form Error Banner]
        FieldErr[Field Error Message]
    end

    Input --> Email
    Email -->|No| ClientErr
    Email -->|Yes| Password
    Password -->|No| ClientErr
    Password -->|Yes| Confirm
    Confirm -->|No| ClientErr
    Confirm -->|Yes| ClientOK

    ClientErr --> FieldErr

    ClientOK --> Submit
    Submit --> Zod
    Zod -->|Invalid| ServerErr
    Zod -->|Valid| Business
    Business -->|Fail| ServerErr
    Business -->|Pass| ServerOK

    ServerErr --> FormErr
```

## 6. Cookie-Based Session Architecture

```mermaid
graph TB
    subgraph "Browser"
        UI["React Components"]
        JSCookies["Document Cookies<br/>(non-httpOnly only)"]
    end

    subgraph "HTTP Layer"
        Request["HTTP Request"]
        Response["HTTP Response"]
        CookieHeader["Cookie Header"]
        SetCookie["Set-Cookie Header"]
    end

    subgraph "Server (Astro)"
        Middleware["Middleware"]
        APIRoutes["API Routes"]
        SupabaseSSR["@supabase/ssr"]
    end

    subgraph "Cookies"
        AccessToken["sb-access-token<br/>httpOnly, secure"]
        RefreshToken["sb-refresh-token<br/>httpOnly, secure"]
    end

    UI --> Request
    Request --> CookieHeader
    CookieHeader --> Middleware
    Middleware --> SupabaseSSR
    SupabaseSSR --> AccessToken
    SupabaseSSR --> RefreshToken

    APIRoutes --> Response
    Response --> SetCookie
    SetCookie --> AccessToken
    SetCookie --> RefreshToken

    AccessToken -.->|httpOnly: JS cannot access| UI
    RefreshToken -.->|httpOnly: JS cannot access| UI

    Note1[/"XSS Protection:<br/>Tokens inaccessible to JavaScript"/]
    AccessToken --- Note1
```

## 7. Protected Route Pattern

```mermaid
flowchart TD
    Request[Incoming Request]
    MW[Middleware]
    CheckCookies{Cookies present?}
    ValidateJWT{JWT valid?}
    CheckEmail{Email verified?}

    SetAnon[Set Anonymous Context]
    SetAuth[Set Authenticated Context]

    RenderPage[Render Page]

    ProtectedPage{Is protected route?}
    RedirectAuth[Redirect to /auth]
    RedirectVerify[Redirect to /auth/verify-email]
    AllowAccess[Allow Access]

    Request --> MW
    MW --> CheckCookies

    CheckCookies -->|No| SetAnon
    CheckCookies -->|Yes| ValidateJWT

    ValidateJWT -->|Invalid| SetAnon
    ValidateJWT -->|Valid| CheckEmail

    CheckEmail -->|No| SetAuth
    CheckEmail -->|Yes| SetAuth

    SetAnon --> RenderPage
    SetAuth --> RenderPage

    RenderPage --> ProtectedPage

    ProtectedPage -->|No| AllowAccess
    ProtectedPage -->|Yes, Anonymous| RedirectAuth
    ProtectedPage -->|Yes, Unverified| RedirectVerify
    ProtectedPage -->|Yes, Verified| AllowAccess
```

## 8. File Structure Overview

```mermaid
graph TB
    subgraph "src/pages"
        direction TB
        auth_astro["auth.astro"]

        subgraph "src/pages/auth"
            verify["verify-email.astro"]
            reset["reset-password.astro"]
            update["update-password.astro"]
        end

        subgraph "src/pages/api/auth"
            api_register["register.ts"]
            api_login["login.ts"]
            api_logout["logout.ts"]
            api_session["session.ts"]
            api_callback["callback.ts"]
            api_reset["reset-password.ts"]
            api_update["update-password.ts"]
            api_refresh["refresh.ts"]
            api_resend["resend-verification.ts"]
        end
    end

    subgraph "src/components/auth"
        AuthIsland["AuthIsland.tsx"]
        AuthContainer["AuthContainer.tsx"]
        AuthModeToggle["AuthModeToggle.tsx"]
        ErrorMessage["ErrorMessage.tsx"]

        subgraph "src/components/auth/forms"
            LoginForm["LoginForm.tsx"]
            RegisterForm["RegisterForm.tsx"]
            ResetPasswordForm["ResetPasswordForm.tsx"]
            UpdatePasswordForm["UpdatePasswordForm.tsx"]
        end
    end

    subgraph "src/components/hooks"
        useAuthForm["useAuthForm.ts"]
        useAuth["useAuth.ts"]
    end

    subgraph "src/lib/services"
        auth_service["auth.service.ts"]
    end

    subgraph "src/lib/schemas"
        auth_schema["auth.schema.ts"]
    end

    subgraph "src/lib/utils"
        auth_errors["auth-errors.ts"]
    end

    subgraph "src/store"
        auth_store["auth.ts"]
    end

    subgraph "src/db"
        supabase_server["supabase.server.ts"]
        supabase_browser["supabase.browser.ts"]
    end

    subgraph "src/middleware"
        middleware["index.ts"]
    end
```

## 9. Error Handling Matrix

```mermaid
graph TD
    subgraph "Error Sources"
        Validation["Validation Error"]
        Auth["Authentication Error"]
        Network["Network Error"]
        Server["Server Error"]
    end

    subgraph "Error Types"
        E400["400 Bad Request"]
        E401["401 Unauthorized"]
        E403["403 Forbidden"]
        E409["409 Conflict"]
        E429["429 Too Many Requests"]
        E500["500 Internal Error"]
    end

    subgraph "Error Codes"
        invalid_email["invalid_email"]
        weak_password["weak_password"]
        invalid_credentials["invalid_credentials"]
        email_not_verified["email_not_verified"]
        email_exists["email_exists"]
        rate_limited["rate_limited"]
        invalid_token["invalid_token"]
        session_expired["session_expired"]
        internal_error["internal_error"]
    end

    subgraph "User Messages"
        M1["INVALID EMAIL FORMAT"]
        M2["PASSWORD TOO WEAK. MIN 8 CHARS"]
        M3["WRONG EMAIL OR PASSWORD"]
        M4["VERIFY YOUR EMAIL FIRST"]
        M5["EMAIL ALREADY REGISTERED"]
        M6["TOO MANY ATTEMPTS. TRY AGAIN LATER"]
        M7["RESET LINK EXPIRED. REQUEST A NEW ONE"]
        M8["SESSION EXPIRED. LOG IN AGAIN"]
        M9["SOMETHING WENT WRONG. TRY AGAIN"]
    end

    Validation --> E400
    Auth --> E401
    Auth --> E403
    Auth --> E409
    Network --> E429
    Server --> E500

    E400 --> invalid_email --> M1
    E400 --> weak_password --> M2
    E401 --> invalid_credentials --> M3
    E401 --> invalid_token --> M7
    E401 --> session_expired --> M8
    E403 --> email_not_verified --> M4
    E409 --> email_exists --> M5
    E429 --> rate_limited --> M6
    E500 --> internal_error --> M9
```
