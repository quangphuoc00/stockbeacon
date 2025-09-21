-- Insert FMP API keys into the database
INSERT INTO fmp_keys (key, number_failures, tries, blacklist) VALUES
  ('373c1hNwagnROis1UHJR9jTXzViV83u3', 0, 0, false),
  ('B03LDokbYh7THSeVz6sbupFJREPw0NEC', 0, 0, false),
  ('LWaRcAEHjGimL1Mj0QPSUhc21fqsSIPb', 0, 0, false),
  ('p5199Avp8adLx7GvLVG508WR57fKhDeU', 0, 0, false)
ON CONFLICT (key) DO NOTHING;
