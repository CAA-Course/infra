terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "caa-infra"
    key    = "terraform/master2024.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region  = "eu-west-1"
  profile = "caa"
}

data "aws_organizations_organizational_unit_child_accounts" "accounts" {
  parent_id = "ou-zgnu-4duq6vdo"
}

# SSO/Identity store setup
resource "aws_ssoadmin_permission_set" "this" {
  name             = "CyberSecurityLab"
  instance_arn     = local.instance_arn
  session_duration = "PT4H"
  relay_state      = "https://${var.students_region}.console.aws.amazon.com/console/home?region=${var.students_region}#"
}

resource "aws_ssoadmin_managed_policy_attachment" "this" {
  instance_arn       = local.instance_arn
  managed_policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
  permission_set_arn = aws_ssoadmin_permission_set.this.arn
}

resource "aws_identitystore_group" "students" {
  display_name      = "Master Students"
  description       = "Group for Cyber Security Lab students"
  identity_store_id = local.instance_id
}

# Students
module "student" {
  for_each = local.students

  source         = "./modules/student"
  account_ids    = [data.aws_organizations_organizational_unit_child_accounts.accounts.accounts[parseint(each.key, 10) - 1].id]
  email          = each.value.emailstud
  group_id       = aws_identitystore_group.students.group_id
  first_name     = title(lower(each.value.Prenume))
  last_name      = title(lower(each.value.Nume))
  instance_id    = local.instance_id
  permission_set = aws_ssoadmin_permission_set.this
}
