resource "aws_organizations_account" "account" {
  email             = var.email
  name              = var.name
  close_on_deletion = true
  parent_id         = var.ou_id

  # There is no AWS Organizations API for reading role_name
  lifecycle {
    ignore_changes = [role_name]
  }
}
