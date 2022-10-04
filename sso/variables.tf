variable "students" {
  type = map(object({
    email      = string
    first_name = string
    last_name  = string
    account_id = string
  }))
}

variable "accounts" {
  type = map(object({
    email = string
    name  = string
  }))
}
