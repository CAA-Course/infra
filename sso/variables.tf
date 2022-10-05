variable "teachers" {
  type = map(object({
    email       = string
    first_name  = string
    last_name   = string
    account_ids = list(string)
  }))
}
