exports.generateOTP = (min = 000000, max = 999999) => {
    const re = /\d\.(\d{6}).*/i;
    let value = re.exec(Math.random().toString());

    return value[1];
}

exports.generateUnixTimestamp = () => {
    return Math.trunc(+new Date() / 1000) + 300;
}
