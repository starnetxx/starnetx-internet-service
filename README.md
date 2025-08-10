# 🌟 StarNetX Internet Service Platform

A comprehensive internet service management platform built with React, TypeScript, and Supabase. StarNetX provides high-speed internet services with user management, plan management, payment processing, and admin controls.

## ✨ Features

### 🚀 Core Features
- **High-Speed Internet Service**: Multiple WiFi locations with unlimited data plans
- **User Management**: Complete user registration, authentication, and profile management
- **Plan Management**: Flexible data plans (Daily, Weekly, Monthly) with customizable pricing
- **Payment Integration**: Flutterwave payment gateway for seamless transactions
- **Virtual Account System**: Automated bank account generation for users
- **Real-time Notifications**: In-app notification system for users and admins

### 👥 User Features
- **Dashboard**: Overview of active plans, wallet balance, and usage statistics
- **Plan Purchase**: Browse and purchase data plans with instant activation
- **Wallet Management**: Fund wallet via bank transfer with virtual accounts
- **Transaction History**: Complete record of all transactions and plan purchases
- **Referral System**: Earn 10% commission on referred users' purchases
- **Settings**: Manage profile, notifications, and account preferences

### 🔧 Admin Features
- **Admin Dashboard**: Comprehensive overview of system statistics
- **User Management**: View, edit, and manage all user accounts
- **Plan Management**: Create, edit, and manage data plans and pricing
- **Location Management**: Manage WiFi locations and network details
- **Transaction Monitoring**: Track all financial transactions and plan purchases
- **Notification System**: Send system-wide notifications to users
- **Referral Tracking**: Monitor referral activities and commission payouts
- **System Settings**: Configure funding charges, referral rates, and system parameters

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **Payment**: Flutterwave API
- **Deployment**: Supabase Edge Functions
- **State Management**: React Context API
- **Database**: PostgreSQL with Row Level Security (RLS)

## 📋 Prerequisites

Before running this project, ensure you have:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Supabase Account** with a project
- **Flutterwave Account** for payment processing
- **Git** for version control

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/binahinnovation/starnetx-internet-service.git
cd starnetx-internet-service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Flutterwave Configuration
VITE_FLUTTERWAVE_PUBLIC_KEY=your_flutterwave_public_key
VITE_FLUTTERWAVE_ENCRYPTION_KEY=your_flutterwave_encryption_key
```

### 4. Supabase Setup
1. Create a new Supabase project
2. Run the database migrations in the `supabase/migrations/` folder
3. Set up Row Level Security (RLS) policies
4. Configure authentication settings
5. Set up storage buckets for file uploads

### 5. Flutterwave Configuration
1. Create a Flutterwave account
2. Get your public and encryption keys
3. Configure webhook endpoints for payment notifications
4. Set up virtual account creation

### 6. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🗄️ Database Schema

### Core Tables
- **profiles**: User profiles and wallet information
- **locations**: WiFi locations and network details
- **plans**: Data plan configurations and pricing
- **transactions**: Financial transactions and plan purchases
- **credentials**: WiFi access credentials for users
- **notifications**: System notifications and user alerts
- **referrals**: Referral tracking and commission management
- **admin_settings**: System configuration and parameters

### Key Relationships
- Users can have multiple active plans
- Plans are associated with specific locations
- Transactions track all financial activities
- Credentials provide WiFi access based on active plans

## 🔐 Security Features

- **Row Level Security (RLS)**: Database-level access control
- **JWT Authentication**: Secure user authentication
- **API Key Protection**: Environment-based configuration
- **Input Validation**: Comprehensive form validation
- **XSS Protection**: Secure rendering of user content
- **CSRF Protection**: Cross-site request forgery prevention

## 📱 Responsive Design

The application is fully responsive and optimized for:
- **Desktop**: Full-featured admin and user interfaces
- **Tablet**: Optimized layouts for medium screens
- **Mobile**: Touch-friendly mobile-first design
- **Progressive Web App**: Installable on mobile devices

## 🚀 Deployment

### Supabase Edge Functions
Deploy the webhook functions to Supabase:

```bash
supabase functions deploy flutterwave-webhook
supabase functions deploy create-virtual-account
```

### Production Build
```bash
npm run build
```

### Environment Variables
Ensure all production environment variables are set in your hosting platform.

## 🔧 Configuration

### Admin Settings
- **Funding Charges**: Configure transaction fees for wallet funding
- **Referral Rates**: Set commission percentages for referrals
- **Plan Pricing**: Manage data plan costs and durations
- **System Parameters**: Configure various system behaviors

### User Permissions
- **Role-based Access**: Admin and user role management
- **Feature Toggles**: Enable/disable specific features
- **Location Access**: Control which locations users can access

## 📊 Monitoring & Analytics

- **Transaction Logs**: Complete audit trail of all activities
- **User Analytics**: Usage patterns and plan preferences
- **Revenue Tracking**: Financial performance monitoring
- **Error Logging**: Comprehensive error tracking and reporting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Email**: binahinnovationtech@gmail.com
- **Issues**: [GitHub Issues](https://github.com/binahinnovation/starnetx-internet-service/issues)
- **Documentation**: Check the code comments and this README

## 🙏 Acknowledgments

- **Supabase** for the excellent backend-as-a-service platform
- **Flutterwave** for reliable payment processing
- **React Team** for the amazing frontend framework
- **Tailwind CSS** for the utility-first CSS framework

## 📈 Roadmap

- [ ] Mobile app development
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] Advanced referral system
- [ ] API rate limiting
- [ ] Advanced security features
- [ ] Performance optimizations
- [ ] Automated testing suite

---

**StarNetX Internet Service Platform** - Empowering high-speed internet connectivity with modern technology! 🚀
