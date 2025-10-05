#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const program = new Command();

const templates = {
  ecommerce: {
    name: 'E-commerce Dashboard',
    description: 'Complete e-commerce management dashboard',
    features: ['Products', 'Orders', 'Customers', 'Analytics', 'Inventory']
  },
  healthcare: {
    name: 'Healthcare Dashboard',
    description: 'Healthcare management system',
    features: ['Patients', 'Appointments', 'Medical Records', 'Billing']
  },
  finance: {
    name: 'Finance Dashboard',
    description: 'Financial management dashboard',
    features: ['Transactions', 'Accounts', 'Reports', 'Budgeting']
  },
  education: {
    name: 'Education Dashboard',
    description: 'Educational institution management',
    features: ['Students', 'Courses', 'Grades', 'Attendance']
  },
  saas: {
    name: 'SaaS Dashboard',
    description: 'SaaS application dashboard',
    features: ['Users', 'Subscriptions', 'Analytics', 'Billing']
  }
};

program
  .name('create-tinadmin')
  .description('Create TinAdmin dashboard templates')
  .version('1.0.0');

program
  .argument('[template]', 'Template name')
  .option('-d, --directory <dir>', 'Project directory name')
  .action(async (template, options) => {
    console.log(chalk.blue.bold('🚀 Welcome to TinAdmin Template Creator!'));
    console.log('');

    let selectedTemplate = template;
    let projectName = options.directory;

    // If no template specified, show selection
    if (!selectedTemplate) {
      const { template: chosenTemplate } = await inquirer.prompt([
        {
          type: 'list',
          name: 'template',
          message: 'Select a template:',
          choices: Object.entries(templates).map(([key, value]) => ({
            name: `${value.name} - ${value.description}`,
            value: key
          }))
        }
      ]);
      selectedTemplate = chosenTemplate;
    }

    // If no directory specified, ask for project name
    if (!projectName) {
      const { name } = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Project name:',
          default: `tinadmin-${selectedTemplate}`,
          validate: (input) => {
            if (!input.trim()) {
              return 'Project name is required';
            }
            if (fs.existsSync(input)) {
              return 'Directory already exists';
            }
            return true;
          }
        }
      ]);
      projectName = name;
    }

    // Show template details
    const templateInfo = templates[selectedTemplate];
    console.log('');
    console.log(chalk.green.bold('📋 Template Details:'));
    console.log(chalk.white(`   Name: ${templateInfo.name}`));
    console.log(chalk.white(`   Description: ${templateInfo.description}`));
    console.log(chalk.white(`   Features: ${templateInfo.features.join(', ')}`));
    console.log('');

    // Confirm creation
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Create ${templateInfo.name} in "${projectName}"?`,
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('❌ Template creation cancelled.'));
      return;
    }

    // Create the project
    try {
      console.log(chalk.blue('🔨 Creating project...'));
      
      // Create directory
      fs.mkdirSync(projectName, { recursive: true });
      
      // Install template package
      process.chdir(projectName);
      execSync(`npm install @tinadmin/template-${selectedTemplate}`, { stdio: 'inherit' });
      
      // Copy template files
      const templatePath = `node_modules/@tinadmin/template-${selectedTemplate}`;
      execSync(`cp -r ${templatePath}/* .`, { stdio: 'inherit' });
      
      // Install dependencies
      execSync('npm install', { stdio: 'inherit' });
      
      console.log('');
      console.log(chalk.green.bold('✅ Template created successfully!'));
      console.log('');
      console.log(chalk.white('Next steps:'));
      console.log(chalk.cyan(`   cd ${projectName}`));
      console.log(chalk.cyan('   npm run dev'));
      console.log('');
      console.log(chalk.white('Your dashboard will be available at:'));
      console.log(chalk.cyan('   http://localhost:3000'));
      
    } catch (error) {
      console.error(chalk.red('❌ Error creating template:'), error.message);
      process.exit(1);
    }
  });

program.parse();
